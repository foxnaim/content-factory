#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT"

command -v uv >/dev/null 2>&1 || {
  printf 'uv is required. Install it from https://docs.astral.sh/uv/\n' >&2
  exit 2
}

if [ ! -x .venv-kokoro/bin/python ]; then
  uv venv .venv-kokoro --python 3.12
fi
uv pip install --python .venv-kokoro/bin/python 'kokoro-mlx==0.1.2'

if [ "${KOKORO_PREWARM:-1}" = "1" ]; then
  mkdir -p .smoke
  printf 'Content Factory neural voice is ready.' | \
    VIRTUAL_ENV="$ROOT/.venv-kokoro" PATH="$ROOT/.venv-kokoro/bin:$PATH" \
    .venv-kokoro/bin/python scripts/kokoro_tts.py \
      --output .smoke/kokoro-setup-check.wav \
      --voice "${KOKORO_VOICE:-am_michael}" \
      --speed "${KOKORO_SPEED:-0.90}" \
      --language en
fi

printf 'Kokoro MLX is ready at %s/.venv-kokoro\n' "$ROOT"
