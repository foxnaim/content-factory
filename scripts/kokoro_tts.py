#!/usr/bin/env python3
"""Small stdin-to-WAV bridge for the host-only Kokoro MLX provider."""

import argparse
import sys

from kokoro_mlx import KokoroTTS


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="mlx-community/Kokoro-82M-bf16")
    parser.add_argument("--voice", default="am_michael")
    parser.add_argument("--speed", type=float, default=0.90)
    parser.add_argument("--language", default="en")
    args = parser.parse_args()
    text = sys.stdin.read().strip()
    if not text:
        raise SystemExit("No text was provided on stdin")

    language = "en-us" if args.language.lower().startswith("en") else args.language
    with KokoroTTS.from_pretrained(args.model) as tts:
        tts.save(
            text,
            args.output,
            voice=args.voice,
            speed=args.speed,
            sample_rate=48000,
            language=language,
        )


if __name__ == "__main__":
    main()
