# Extending Karve: Adding Profiles, Styles & Visual Experiments

## 1. Overview
Karve is built to be extensible without compromising its deterministic core. You can extend Karve in three primary ways:
1. Adding a new **Rendering Profile** (e.g., `square` 1080x1080 for Instagram).
2. Adding a new **Visual Style** (e.g., `karve-minimal`, `karve-cyber`).
3. Creating a new **P6-C Isolated Visual Experiment**.

---

## 2. Adding a New Rendering Profile

Rendering profiles define canvas dimensions, framerate, video layouts, and caption placement.

### Step 1: Update `config/p6-profiles.json`
Add your new profile definition:
```json
{
  "profiles": {
    "square": {
      "canvas": { "width": 1080, "height": 1080, "fps": 30 },
      "layout": "contain_blur",
      "captions": {
        "font_size": 54,
        "max_width_fraction": 0.82,
        "edge_offset_fraction": 0.12
      }
    }
  }
}
```

### Step 2: Validate Schema & Types
```bash
docker compose run --rm karve tsc --noEmit
```

### Step 3: Render the New Profile
```bash
bash scripts/p6-run.sh tech-test-01 --profile square --force
bash scripts/p6-verify.sh tech-test-01 square
```

---

## 3. Adding a New Visual Style

Styles customize card borders, colors, shadow blur, and motion speeds.

1. Open `config/p6-profiles.json` under the `"styles"` key.
2. Define your style object:
   ```json
   "karve-editorial": {
     "card_background": "rgba(245, 245, 247, 0.95)",
     "card_text_color": "#1D1D1F",
     "border_radius": 16,
     "punch_scale": { "subtle": 1.02, "normal": 1.04, "strong": 1.07 }
   }
   ```
3. Pass `--style karve-editorial` to `p6-run.sh`.

---

## 4. Creating an Isolated P6-C Visual Experiment

Follow the pattern proven in `experiments/tech-test-01/`:

1. **Create Experiment Directory:**
   ```bash
   mkdir -p experiments/<my-experiment>/components
   ```
2. **Draft the Plan:**
   Create `experiments/<my-experiment>/visual-plan.json` conforming to the `AGENTS.md` visual-plan contract.
3. **Build Experiment Components:**
   - Use `video-talkcraft` recipes as design references.
   - Build custom animated nodes under `experiments/<my-experiment>/components/`.
   - Re-use canonical `ArabicCaptions` and `VisualOverlays` from `remotion/components/`.
4. **Create Root & Composition:**
   - Register composition in `experiments/<my-experiment>/Root.tsx` and export from `index.ts`.
5. **Render & Document:**
   - Execute render to `experiments/<my-experiment>/p6c-visual-<profile>.mp4`.
   - Write `experiments/<my-experiment>/implementation-report.md`.
