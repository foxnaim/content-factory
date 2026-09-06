#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")" && pwd)"
source_assets="$root_dir/../lead-rescue-cartoon/assets"
output_dir="$root_dir/output"
silent="$output_dir/lead-rescue-cartoon-v2-silent.mp4"
final="$output_dir/lead-rescue-cartoon-v2.mp4"

mkdir -p "$output_dir"

ffmpeg -y -hide_banner -loglevel error \
  -i "$silent" \
  -i "$source_assets/narration.wav" \
  -i "$source_assets/arrival.wav" \
  -i "$source_assets/repair.wav" \
  -i "$source_assets/success.wav" \
  -f lavfi -t 17 -i "sine=frequency=220:sample_rate=48000" \
  -filter_complex "\
    [1:a]volume=1.05[narration];\
    [2:a]volume=0.16,adelay=180|180[arrival];\
    [3:a]volume=0.10,adelay=9200|9200[repair];\
    [4:a]volume=0.12,adelay=12900|12900[success];\
    [5:a]volume=0.010,tremolo=f=0.18:d=0.35,lowpass=f=700[music];\
    [narration][arrival][repair][success][music]amix=inputs=5:duration=longest:normalize=0,alimiter=limit=0.92[a]" \
  -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$final"

echo "$final"
