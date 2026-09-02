# Remotion Studio Live Preview & Frame Inspection Guide

## 1. Why Use Remotion Studio?
Instead of waiting 60–90 seconds for a full MP4 render during UI/CSS tweaking, you can launch the **Remotion Studio** web interface inside Docker to scrub through frames, inspect animations, and verify Arabic text shaping in real time.

---

## 2. Launching Remotion Studio

Run the preview command inside Docker with port `3000` mapped to your host browser:

```bash
# 1. Preview Canonical Karve Composition
docker compose run --rm -p 3000:3000 karve \
  remotion preview remotion/index.ts \
  --public-dir /karve-data/projects/tech-test-01 \
  --props /karve-data/projects/tech-test-01/p6-source.plan.json \
  --port 3000

# 2. Preview P6-C Isolated Experiment Composition
docker compose run --rm -p 3000:3000 karve \
  remotion preview experiments/tech-test-01/index.ts \
  --public-dir /karve-data/projects/tech-test-01 \
  --props /karve-data/projects/tech-test-01/p6-source.plan.json \
  --port 3000
```

---

## 3. Viewing in Browser
Open your browser at:
```text
http://localhost:3000
```

### Key Keyboard Shortcuts in Remotion Studio:
- **`Space`**: Play / Pause
- **`Left` / `Right` Arrow**: Step backward / forward 1 frame
- **`Shift + Left / Right`**: Jump 1 second (30 frames)
- **`I` / `O`**: Set In / Out points for looping a specific beat (e.g. `12.82s` to `19.40s`)
- **`C`**: Toggle Caption safe area & action safe overlays

---

## 4. Single-Frame Render Verification (Low-Cost CLI Testing)

If you only want to inspect a single frame (e.g., verifying the PiP state at frame 500 without opening the browser):

```bash
docker compose run --rm karve \
  remotion still experiments/tech-test-01/index.ts TechTest01P6C \
  experiments/tech-test-01/frame-500.png \
  --frame 500 \
  --props /karve-data/projects/tech-test-01/p6-source.plan.json \
  --public-dir /karve-data/projects/tech-test-01 \
  --overwrite
```
