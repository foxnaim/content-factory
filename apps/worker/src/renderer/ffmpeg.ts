import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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

  async render(script: VideoScript, audioPath?: string, sceneImagePaths: string[] = []): Promise<RenderResult> {
    const directory = await mkdtemp(join(tmpdir(), "content-factory-render-"));
    const output = join(directory, "draft.mp4");
    const metadata = join(directory, "metadata.json");
    const expandedImages = expandSceneImages(sceneImagePaths, script.scenes.length);
    const filter = await this.buildFilter(script, directory, expandedImages.length > 0);
    const args = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `color=c=0x090A12:s=${this.width}x${this.height}:r=${this.fps}:d=${script.target_duration_sec}`
    ];
    for (const imagePath of expandedImages) args.push("-loop", "1", "-framerate", String(this.fps), "-i", imagePath);
    if (audioPath) args.push("-i", audioPath);
    if (expandedImages.length) {
      args.push("-filter_complex", this.buildImageComposition(script, expandedImages.length, filter), "-map", "[video]");
      if (audioPath) args.push("-map", `${expandedImages.length + 1}:a:0`);
    } else {
      args.push("-vf", filter);
    }
    args.push("-r", String(this.fps), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
    if (audioPath) {
      const integrated = process.env.AUDIO_LOUDNESS_I ?? "-16";
      const truePeak = process.env.AUDIO_TRUE_PEAK ?? "-1.5";
      const loudnessRange = process.env.AUDIO_LOUDNESS_RANGE ?? "11";
      args.push(
        "-af", `loudnorm=I=${integrated}:TP=${truePeak}:LRA=${loudnessRange},apad=whole_dur=${script.target_duration_sec}`,
        "-c:a", "aac", "-t", String(script.target_duration_sec)
      );
    }
    else args.push("-an", "-t", String(script.target_duration_sec));
    args.push(output);

    await run(this.ffmpeg, args);
    await writeFile(metadata, JSON.stringify({
      title: script.title,
      description: script.description,
      language: script.language,
      target_duration_sec: script.target_duration_sec,
      cta: script.cta,
      renderer_theme: expandedImages.length ? "storybook-clay-v1" : "cartoon-board-v1",
      scene_image_count: sceneImagePaths.length,
      audio_loudness_target_lufs: audioPath ? Number(process.env.AUDIO_LOUDNESS_I ?? -16) : null,
      publishing: "manual-approval-only"
    }, null, 2));
    return { videoPath: output, metadataPath: metadata, cleanup: () => rm(directory, { recursive: true, force: true }) };
  }

  private async buildFilter(script: VideoScript, directory: string, illustrated = false): Promise<string> {
    const boldFont = process.env.RENDER_BOLD_FONT ?? firstExisting([
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    ]);
    const regularFont = process.env.RENDER_REGULAR_FONT ?? firstExisting([
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/System/Library/Fonts/Supplemental/Arial.ttf"
    ]);
    const titlePath = join(directory, "title.txt");
    await writeFile(titlePath, wrapSubtitle(script.title.toUpperCase(), 34));

    const filters = illustrated ? [
      "format=yuv420p",
      `drawbox=x=38:y=42:w=${this.width - 76}:h=146:c=0x07111F@0.82:t=fill`,
      "drawbox=x=38:y=42:w=10:h=146:c=0x49D6C8:t=fill",
      `drawtext=fontfile=${boldFont}:text='BUILD WITH YAN  •  LITTLE STORIES':fontcolor=0xB9E9E3:fontsize=23:x=72:y=72`,
      `drawtext=fontfile=${boldFont}:textfile=${titlePath}:fontcolor=white:fontsize=30:line_spacing=7:x=72:y=108`,
      `drawbox=x=54:y=${this.height - 118}:w=${this.width - 108}:h=9:c=white@0.20:t=fill`,
      `drawbox=x=54:y=${this.height - 118}:w='(${this.width - 108})*min(t/${script.target_duration_sec},1)':h=9:c=0xFFD166:t=fill`,
      `drawtext=fontfile=${regularFont}:text='ORIGINAL ILLUSTRATION  •  HUMAN REVIEW':fontcolor=0xD5E6E8:fontsize=21:x=54:y=${this.height - 82}`,
      `drawtext=fontfile=${boldFont}:text='${script.target_duration_sec} SEC':fontcolor=0xFFD166:fontsize=22:x=w-text_w-54:y=${this.height - 82}`
    ] : [
      "format=yuv420p",
      "drawgrid=w=108:h=108:t=1:c=0xFFFFFF10",
      `drawbox=x='-260+mod(t*42,1340)':y=0:w=320:h=${this.height}:c=0x7C5CFC@0.10:t=fill`,
      `drawbox=x='${this.width}-mod(t*27,1380)':y=0:w=260:h=${this.height}:c=0x2DD4BF@0.07:t=fill`,
      `drawbox=x=54:y=56:w=${this.width - 108}:h=132:c=0x101421@0.94:t=fill`,
      "drawbox=x=54:y=56:w=10:h=132:c=0x8B5CF6:t=fill",
      `drawtext=fontfile=${boldFont}:text='BUILD WITH YAN  •  CONTENT FACTORY':fontcolor=0xB9B7C8:fontsize=24:x=86:y=82`,
      `drawtext=fontfile=${boldFont}:textfile=${titlePath}:fontcolor=white:fontsize=30:line_spacing=7:x=86:y=116`,
      `drawbox=x=54:y=${this.height - 174}:w=${this.width - 108}:h=10:c=white@0.14:t=fill`,
      `drawbox=x=54:y=${this.height - 174}:w='(${this.width - 108})*min(t/${script.target_duration_sec},1)':h=10:c=0x8B5CF6:t=fill`,
      `drawtext=fontfile=${regularFont}:text='ORIGINAL DRAFT  •  HUMAN REVIEW REQUIRED':fontcolor=0x94A3B8:fontsize=23:x=54:y=${this.height - 128}`,
      `drawtext=fontfile=${boldFont}:text='${script.target_duration_sec} SEC  •  9\\:16':fontcolor=0x2DD4BF:fontsize=23:x=w-text_w-54:y=${this.height - 128}`
    ];
    const accents = ["0x8B5CF6", "0x2DD4BF", "0xF59E0B", "0xEC4899", "0x38BDF8"];
    let start = 0;
    for (const scene of script.scenes) {
      const accent = accents[scene.index % accents.length];
      const textPath = join(directory, `scene-${scene.index}-headline.txt`);
      const voicePath = join(directory, `scene-${scene.index}-body.txt`);
      await writeFile(textPath, wrapSubtitle(scene.subtitle.toUpperCase(), 20));
      await writeFile(voicePath, limitLines(wrapSubtitle(scene.voiceover, 42), 4));
      const end = start + scene.duration_sec;
      const fade = `if(lt(t-${start}\,0.35)\,(t-${start})/0.35\,if(gt(t\,${end}-0.35)\,(${end}-t)/0.35\,1))`;
      const slideX = `96+if(lt(t-${start}\,0.5)\,-220*(1-(t-${start})/0.5)\,0)`;
      const bob = `486+8*sin((t-${start})*4)`;
      const leadX = `500+285*(0.5+0.5*sin((t-${start})*1.35-1.57))`;
      const enabled = `enable='between(t,${start},${end})'`;
      if (illustrated) {
        filters.push(
          `drawbox=x=42:y=1084:w=${this.width - 84}:h=650:c=0x07111F@0.78:t=fill:enable='between(t,${start},${end})'`,
          `drawbox=x=42:y=1084:w=12:h=650:c=${accent}:t=fill:enable='between(t,${start},${end})'`,
          `drawbox=x=82:y=1130:w=244:h=58:c=${accent}@0.24:t=fill:enable='between(t,${start},${end})'`,
          `drawtext=fontfile=${boldFont}:text='STORY ${String(scene.index + 1).padStart(2, "0")}  /  ${String(script.scenes.length).padStart(2, "0")}':fontcolor=${accent}:fontsize=23:x=104:y=1147:alpha='${fade}':enable='between(t,${start},${end})'`,
          `drawtext=fontfile=${boldFont}:textfile=${textPath}:fontcolor=white:fontsize=58:line_spacing=16:x='${slideX}':y=1220:alpha='${fade}':enable='between(t,${start},${end})'`,
          `drawbox=x=96:y=1432:w=190:h=7:c=${accent}:t=fill:enable='between(t,${start},${end})'`,
          `drawtext=fontfile=${regularFont}:textfile=${voicePath}:fontcolor=0xE4EEF0:fontsize=32:line_spacing=13:x=96:y=1470:alpha='${fade}':enable='between(t,${start},${end})'`,
          `drawtext=fontfile=${boldFont}:text='${displayLabel(scene.visual_type)}':fontcolor=${accent}:fontsize=20:x=96:y=1684:alpha='${fade}':enable='between(t,${start},${end})'`
        );
      } else filters.push(
        `drawbox=x=54:y=292:w=${this.width - 108}:h=1190:c=0x0B0F1A@0.92:t=fill:enable='between(t,${start},${end})'`,
        `drawbox=x=54:y=292:w=12:h=1190:c=${accent}:t=fill:enable='between(t,${start},${end})'`,
        `drawbox=x=96:y=354:w=260:h=64:c=${accent}@0.18:t=fill:enable='between(t,${start},${end})'`,
        `drawtext=fontfile=${boldFont}:text='SCENE ${String(scene.index + 1).padStart(2, "0")}  /  ${String(script.scenes.length).padStart(2, "0")}':fontcolor=${accent}:fontsize=25:x=120:y=372:alpha='${fade}':enable='between(t,${start},${end})'`,
        `drawtext=fontfile=${boldFont}:text='${String(scene.index + 1).padStart(2, "0")}':fontcolor=${accent}@0.13:fontsize=250:x=w-text_w-88:y=360:alpha='${fade}':enable='between(t,${start},${end})'`,
        // Original block-character animation: a small robot follows a lead through a CRM board.
        `drawbox=x=106:y='${bob}':w=214:h=170:c=${accent}:t=fill:${enabled}`,
        `drawbox=x=124:y='${bob}+18':w=178:h=132:c=0x111827:t=fill:${enabled}`,
        `drawbox=x=154:y='${bob}+53':w=24:h=24:c=0xF8FAFC:t=fill:${enabled}`,
        `drawbox=x=248:y='${bob}+53':w=24:h=24:c=0xF8FAFC:t=fill:${enabled}`,
        `drawbox=x=185:y='${bob}+102':w=56:h=9:c=${accent}:t=fill:${enabled}`,
        `drawbox=x=139:y='${bob}+170':w=148:h=110:c=0x1E293B:t=fill:${enabled}`,
        `drawbox=x=86:y='${bob}+194':w=53:h=22:c=${accent}:t=fill:${enabled}`,
        `drawbox=x=287:y='${bob}+194':w=53:h=22:c=${accent}:t=fill:${enabled}`,
        `drawtext=fontfile=${boldFont}:text='AI':fontcolor=${accent}:fontsize=34:x=191:y='${bob}+205':alpha='${fade}':${enabled}`,
        `drawbox=x=430:y=470:w=540:h=330:c=0x111827:t=fill:${enabled}`,
        `drawbox=x=430:y=470:w=540:h=330:c=${accent}:t=3:${enabled}`,
        `drawbox=x=454:y=494:w=492:h=46:c=${accent}@0.18:t=fill:${enabled}`,
        `drawtext=fontfile=${boldFont}:text='LEAD  →  CRM  →  RESULT':fontcolor=0xE2E8F0:fontsize=22:x=478:y=507:alpha='${fade}':${enabled}`,
        `drawbox=x=476:y=574:w=128:h=42:c=0x334155:t=fill:${enabled}`,
        `drawbox=x=645:y=574:w=128:h=42:c=0x334155:t=fill:${enabled}`,
        `drawbox=x=814:y=574:w=128:h=42:c=0x334155:t=fill:${enabled}`,
        `drawbox=x='${leadX}':y=659:w=118:h=62:c=${accent}:t=fill:${enabled}`,
        `drawbox=x=480:y=749:w=440:h=7:c=0x334155:t=fill:${enabled}`,
        `drawbox=x=480:y=749:w='440*(0.5+0.5*sin((t-${start})*1.35-1.57))':h=7:c=${accent}:t=fill:${enabled}`,
        `drawtext=fontfile=${boldFont}:textfile=${textPath}:fontcolor=white:fontsize=64:line_spacing=18:x='${slideX}':y=884:alpha='${fade}':enable='between(t,${start},${end})'`,
        `drawbox=x=96:y=1118:w=220:h=8:c=${accent}:t=fill:enable='between(t,${start},${end})'`,
        `drawtext=fontfile=${regularFont}:textfile=${voicePath}:fontcolor=0xCBD5E1:fontsize=34:line_spacing=14:x=96:y=1160:alpha='${fade}':enable='between(t,${start},${end})'`,
        `drawtext=fontfile=${boldFont}:text='${displayLabel(scene.visual_type)}':fontcolor=${accent}:fontsize=22:x=96:y=1390:alpha='${fade}':enable='between(t,${start},${end})'`
      );
      start = end;
    }
    return filters.join(",");
  }

  private buildImageComposition(script: VideoScript, imageCount: number, styleFilter: string): string {
    const sections: string[] = [];
    let start = 0;
    for (let index = 0; index < imageCount; index += 1) {
      const duration = script.scenes[index]!.duration_sec;
      const zoom = index % 2 === 0 ? "min(zoom+0.00018,1.045)" : "if(eq(on,1),1.045,max(1.0,zoom-0.00018))";
      sections.push(
        `[${index + 1}:v]scale=${this.width}:${this.height}:force_original_aspect_ratio=increase,` +
        `crop=${this.width}:${this.height},zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
        `d=1:s=${this.width}x${this.height}:fps=${this.fps},trim=duration=${duration},` +
        `fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st=${Math.max(duration - 0.35, 0)}:d=0.35:alpha=1,` +
        `setpts=PTS-STARTPTS+${start}/TB[scene_image_${index}]`
      );
      start += duration;
    }
    let current = "0:v";
    start = 0;
    for (let index = 0; index < imageCount; index += 1) {
      const end = start + script.scenes[index]!.duration_sec;
      const output = `composite_${index}`;
      sections.push(`[${current}][scene_image_${index}]overlay=0:0:eof_action=repeat:enable='between(t,${start},${end})'[${output}]`);
      current = output;
      start = end;
    }
    sections.push(`[${current}]${styleFilter}[video]`);
    return sections.join(";");
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

export function limitLines(value: string, maxLines: number): string {
  if (maxLines <= 0) return "";
  const lines = value.split("\n");
  if (lines.length <= maxLines) return value;
  const visible = lines.slice(0, maxLines);
  const lastIndex = maxLines - 1;
  visible[lastIndex] = `${visible[lastIndex]!.replace(/[.…]+$/, "")}…`;
  return visible.join("\n");
}

export function displayLabel(value: string): string {
  return value.replace(/[_-]+/g, " ").trim().toUpperCase();
}

export function expandSceneImages(paths: string[], sceneCount: number): string[] {
  if (!paths.length || sceneCount <= 0) return [];
  return Array.from({ length: sceneCount }, (_, index) => paths[Math.min(Math.floor(index * paths.length / sceneCount), paths.length - 1)]!);
}

function firstExisting(paths: string[]): string {
  return paths.find((path) => existsSync(path)) ?? paths[0]!;
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
