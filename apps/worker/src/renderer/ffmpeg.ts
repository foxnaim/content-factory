import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VideoScript } from "@content-factory/shared";

export type RenderResult = { videoPath: string; metadataPath: string; cleanup: () => Promise<void> };

export class FfmpegRenderer {
  private readonly ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  private readonly width = Number(process.env.RENDER_WIDTH ?? 1080);
  private readonly height = Number(process.env.RENDER_HEIGHT ?? 1920);
  private readonly fps = Number(process.env.RENDER_FPS ?? 30);

  async render(script: VideoScript, audioPath?: string): Promise<RenderResult> {
    const directory = await mkdtemp(join(tmpdir(), "content-factory-render-"));
    const output = join(directory, "draft.mp4");
    const metadata = join(directory, "metadata.json");
    const filter = await this.buildFilter(script, directory);
    const args = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `color=c=0x090A12:s=${this.width}x${this.height}:r=${this.fps}:d=${script.target_duration_sec}`
    ];
    if (audioPath) args.push("-i", audioPath);
    args.push("-vf", filter, "-r", String(this.fps), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
    if (audioPath) args.push("-af", `apad=whole_dur=${script.target_duration_sec}`, "-c:a", "aac", "-t", String(script.target_duration_sec));
    else args.push("-an", "-t", String(script.target_duration_sec));
    args.push(output);

    await run(this.ffmpeg, args);
    await writeFile(metadata, JSON.stringify({
      title: script.title,
      description: script.description,
      language: script.language,
      target_duration_sec: script.target_duration_sec,
      cta: script.cta,
      publishing: "manual-approval-only"
    }, null, 2));
    return { videoPath: output, metadataPath: metadata, cleanup: () => rm(directory, { recursive: true, force: true }) };
  }

  private async buildFilter(script: VideoScript, directory: string): Promise<string> {
    const filters = [
      "drawgrid=w=120:h=120:t=1:c=0x5E42A640",
      `drawbox=x=60:y=70:w=${this.width - 120}:h=5:c=0x8E66FF:t=fill`,
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='BUILD WITH YAN / CONTENT FACTORY':fontcolor=0xBDBCCB:fontsize=28:x=70:y=95`
    ];
    let start = 0;
    for (const scene of script.scenes) {
      const textPath = join(directory, `scene-${scene.index}.txt`);
      await writeFile(textPath, wrapSubtitle(scene.subtitle));
      const end = start + scene.duration_sec;
      filters.push(
        `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${textPath}:fontcolor=white:fontsize=54:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=0x090A12CC:boxborderw=40:enable='between(t,${start},${end})'`
      );
      start = end;
    }
    filters.push(`drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='DRAFT • REVIEW REQUIRED':fontcolor=0x79EED8:fontsize=26:x=70:y=h-120`);
    return filters.join(",");
  }
}

export function wrapSubtitle(value: string, maxCharacters = 26): string {
  return value.split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap((word) => {
      if (word.length <= maxCharacters) return [word];
      return Array.from({ length: Math.ceil(word.length / maxCharacters) }, (_, index) => word.slice(index * maxCharacters, (index + 1) * maxCharacters));
    });
    const lines: string[] = [];
    for (const word of words) {
      const current = lines.at(-1);
      if (!current || current.length + 1 + word.length > maxCharacters) lines.push(word);
      else lines[lines.length - 1] = `${current} ${word}`;
    }
    return lines.length ? lines : [""];
  }).join("\n");
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk).slice(0, 20_000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}: ${stderr}`)));
  });
}
