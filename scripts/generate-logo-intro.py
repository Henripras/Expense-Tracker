"""
Script to generate the animated logo intro GIF from a 3x3 storyboard grid.
"""
import sys
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    print("Pillow is required: pip install Pillow")
    sys.exit(1)

def generate_intro_gif(src_path: str = None, out_path: str = None):
    project_root = Path(__file__).resolve().parent.parent
    
    if not src_path:
        # Search for potential storyboard files
        candidates = list(project_root.glob("*grid*.png")) + list(project_root.parent.glob("*grid*.png"))
        if candidates:
            src = candidates[0]
        else:
            src = Path(project_root / "public" / "storyboard_grid.png")
    else:
        src = Path(src_path)

    if not src.exists():
        print(f"Source storyboard image not found at: {src}")
        return

    out = Path(out_path) if out_path else (project_root / "public" / "opener.gif")

    print(f"Reading storyboard from: {src}")
    im = Image.open(src).convert("RGB")

    W, H = im.size
    frames = []
    for r in range(3):
        for c in range(3):
            left = round(c * W / 3) + (5 if c > 0 else 0)
            right = round((c + 1) * W / 3) - (5 if c < 2 else 0)
            top = round(r * H / 3) + (5 if r > 0 else 0)
            bottom = round((r + 1) * H / 3) - (5 if r < 2 else 0)
            frame = im.crop((left, top, right, bottom))
            # Normalize all frames to the same size for smooth playback
            frame = frame.resize((500, 333), Image.Resampling.LANCZOS)
            frames.append(frame)

    # Fast snappy animation for app splash screen (total ~955ms, max 1 second)
    durations = [75, 75, 75, 75, 75, 75, 75, 90, 340]
    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2
    )

    print(f"Created: {out}")
    print(f"Frames: {len(frames)} | Size: {frames[0].size} | Duration: {sum(durations)/1000:.2f}s")

if __name__ == "__main__":
    src_arg = sys.argv[1] if len(sys.argv) > 1 else None
    out_arg = sys.argv[2] if len(sys.argv) > 2 else None
    generate_intro_gif(src_arg, out_arg)
