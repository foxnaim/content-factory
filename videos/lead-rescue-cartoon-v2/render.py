#!/usr/bin/env python3
"""Render the image-generated story frames as a smooth vertical cartoon.

The renderer is deterministic and offline. It creates in-between frames with
bidirectional optical flow, adds a restrained camera move and burns readable
English captions into the safe lower third. FFmpeg handles the final audio mix.
"""

from __future__ import annotations

import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "assets" / "keyframes"
OUTPUT = ROOT / "output"
WIDTH, HEIGHT, FPS = 720, 1280, 30
DURATION = 17.0


@dataclass(frozen=True)
class Scene:
    start: float
    end: float
    prefix: str
    camera: str


SCENES = (
    Scene(0.0, 4.0, "01-arrival", "push"),
    Scene(4.0, 8.25, "02-lost", "drift"),
    Scene(8.25, 12.5, "03-repair", "push"),
    Scene(12.5, 17.0, "04-home", "pull"),
)

CAPTIONS = (
    (0.30, 3.55, "A new lead lands in the CRM."),
    (3.72, 6.62, "No owner. No alert. No next step."),
    (6.63, 9.52, "The little robot follows the trail."),
    (9.53, 12.58, "Assign. Alert. Log. Follow up."),
    (12.59, 16.95, "Every lead gets a clear way home."),
)


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def load_frame(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(path)
    return cv2.resize(image, (WIDTH, HEIGHT), interpolation=cv2.INTER_LANCZOS4)


def flow_pair(first: np.ndarray, second: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    gray_a = cv2.cvtColor(first, cv2.COLOR_BGR2GRAY)
    gray_b = cv2.cvtColor(second, cv2.COLOR_BGR2GRAY)
    return dis.calc(gray_a, gray_b, None), dis.calc(gray_b, gray_a, None)


def morph(
    first: np.ndarray,
    second: np.ndarray,
    forward: np.ndarray,
    backward: np.ndarray,
    amount: float,
) -> np.ndarray:
    amount = smoothstep(amount)
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    from_a = cv2.remap(
        first,
        xx - forward[..., 0] * amount,
        yy - forward[..., 1] * amount,
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REFLECT,
    )
    from_b = cv2.remap(
        second,
        xx - backward[..., 0] * (1.0 - amount),
        yy - backward[..., 1] * (1.0 - amount),
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REFLECT,
    )
    return cv2.addWeighted(from_a, 1.0 - amount, from_b, amount, 0.0)


def camera_move(frame: np.ndarray, progress: float, mode: str) -> np.ndarray:
    if mode == "pull":
        zoom = 1.045 - 0.032 * smoothstep(progress)
    else:
        zoom = 1.012 + 0.025 * smoothstep(progress)
    enlarged = cv2.resize(frame, None, fx=zoom, fy=zoom, interpolation=cv2.INTER_CUBIC)
    max_x = enlarged.shape[1] - WIDTH
    max_y = enlarged.shape[0] - HEIGHT
    if mode == "drift":
        x = int(max_x * (0.28 + 0.30 * smoothstep(progress)))
    else:
        x = max_x // 2
    y = int(max_y * (0.35 + 0.10 * smoothstep(progress)))
    return enlarged[y : y + HEIGHT, x : x + WIDTH]


def caption_for(time_sec: float) -> str | None:
    for start, end, text in CAPTIONS:
        if start <= time_sec <= end:
            return text
    return None


def draw_caption(frame: np.ndarray, text: str | None, time_sec: float) -> np.ndarray:
    if not text:
        return frame
    current = next(item for item in CAPTIONS if item[2] == text)
    fade = min((time_sec - current[0]) / 0.16, (current[1] - time_sec) / 0.16, 1.0)
    alpha = int(236 * smoothstep(max(0.0, fade)))
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(rgb).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf", 38)
    max_width = 620
    words, lines, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    lines.append(line)
    line_height = 48
    box_h = 58 + line_height * len(lines)
    top = 1055 - box_h // 2
    draw.rounded_rectangle((35, top, 685, top + box_h), radius=30, fill=(5, 17, 34, alpha), outline=(255, 209, 102, int(alpha * 0.65)), width=2)
    y = top + 26
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (WIDTH - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), line, font=font, fill=(255, 255, 255, alpha), stroke_width=1, stroke_fill=(0, 0, 0, alpha))
        y += line_height
    return cv2.cvtColor(np.array(Image.alpha_composite(image, overlay).convert("RGB")), cv2.COLOR_RGB2BGR)


def add_film_finish(frame: np.ndarray, index: int) -> np.ndarray:
    # Gentle warm pulse and deterministic grain keep the stop-motion texture alive.
    pulse = 1.0 + 0.012 * math.sin(index / FPS * math.tau * 0.7)
    finished = np.clip(frame.astype(np.float32) * pulse, 0, 255)
    rng = np.random.default_rng(731 + index)
    grain = rng.normal(0, 1.3, finished.shape[:2])[..., None]
    return np.clip(finished + grain, 0, 255).astype(np.uint8)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene_data = []
    for scene in SCENES:
        keys = [load_frame(FRAMES / f"{scene.prefix}-{number}.png") for number in range(3)]
        scene_data.append((keys, flow_pair(keys[0], keys[1]), flow_pair(keys[1], keys[2])))

    silent = OUTPUT / "lead-rescue-cartoon-v2-silent.mp4"
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(silent),
    ]
    encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert encoder.stdin is not None

    total_frames = round(DURATION * FPS)
    for index in range(total_frames):
        time_sec = index / FPS
        scene_index = next(i for i, s in enumerate(SCENES) if s.start <= time_sec < s.end)
        scene = SCENES[scene_index]
        keys, first_flow, second_flow = scene_data[scene_index]
        progress = (time_sec - scene.start) / (scene.end - scene.start)
        # Two deliberate character beats per shot with a brief hold at the end.
        if progress < 0.43:
            frame = morph(keys[0], keys[1], *first_flow, progress / 0.43)
        elif progress < 0.82:
            frame = morph(keys[1], keys[2], *second_flow, (progress - 0.43) / 0.39)
        else:
            frame = keys[2].copy()
        frame = camera_move(frame, progress, scene.camera)
        # A fast dip at each cut avoids ugly cross-scene morphing.
        edge = min((time_sec - scene.start) / 0.12, (scene.end - time_sec) / 0.12, 1.0)
        frame = np.clip(frame.astype(np.float32) * (0.72 + 0.28 * smoothstep(max(0.0, edge))), 0, 255).astype(np.uint8)
        frame = draw_caption(frame, caption_for(time_sec), time_sec)
        encoder.stdin.write(add_film_finish(frame, index).tobytes())

    encoder.stdin.close()
    if encoder.wait() != 0:
        raise SystemExit("FFmpeg video encoding failed")


if __name__ == "__main__":
    main()
