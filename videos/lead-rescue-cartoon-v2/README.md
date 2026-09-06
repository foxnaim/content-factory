# Lead Rescue Cartoon v2

A 17-second, vertical children's stop-motion short made from twelve original
image-generated keyframes. The renderer creates in-betweens locally with
bidirectional optical flow, adds a subtle camera move, English captions and a
separate audio mix. Nothing is published automatically.

## Render

```bash
python3 render.py
./mix-audio.sh
```

Requirements: Python 3, Pillow, OpenCV and FFmpeg.

The final review file is written to `output/lead-rescue-cartoon-v2.mp4`.
