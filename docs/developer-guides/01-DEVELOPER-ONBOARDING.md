# Developer Onboarding & Fast Ramp-Up Guide

## 1. Quickstart (3-Minute Setup)

Karve is a local-first, containerized video intelligence and rendering engine. Follow these steps to set up your environment:

### Prerequisites
- Docker and Docker Compose v2+
- Linux / WSL2 environment
- Local Bifrost LLM gateway running at `http://127.0.0.1:10020`
- `ffmpeg` installed locally or accessed via container

### Step 1: Verify Host & Docker Environment
```bash
# Verify Docker is running
docker compose version

# Verify Bifrost LLM gateway connectivity from host
curl -s http://127.0.0.1:10020/health || echo "Bifrost Gateway check"

# Check data volume directory
mkdir -p /home/hany/karve-data/projects
```

### Step 2: Run Regression & Logic Tests
Before touching code, verify the active pipeline state:
```bash
bash scripts/p6-logic-test.sh
```
*Expected output: All 16 alignment, cardinality, and timeline tests PASS.*

---

## 2. The 5 Golden Rules of Karve Development

1. **Strict Phase Discipline:**
   - Do not implement future phase features early. Respect active gates (P0–P6).
2. **Immutable Input Evidence:**
   - `transcript.json`, `source.json`, `edit-plan.json`, and `timeline-map.json` are ground truth evidence. Never mutate them.
3. **Local Bifrost LLM Boundary:**
   - All LLM passes (P4 edit plan, P6-B caption correction) must communicate exclusively with the local Bifrost gateway.
4. **No Global WSL AI Toolchain Installs:**
   - Run AI/Remotion/Whisper execution inside Docker containers using the pinned container images.
5. **Deterministic Mapping:**
   - All presentation overlays, caption timings, and punch-ins must be translated through `timeline-map.json`.

---

## 3. Standard Daily Development Workflow

```bash
# 1. Pull latest verified branch
git checkout p6-captions-motion-safe
git pull origin p6-captions-motion-safe

# 2. Typecheck before any edits
docker compose run --rm karve tsc --noEmit

# 3. Test baseline render on a real project
bash scripts/p6-run.sh tech-test-01 --profile source --force
bash scripts/p6-verify.sh tech-test-01 source
```

---

## 4. Key Directory Structure

```text
karve/
├── config/                  # Profile configurations (p6-profiles.json)
├── docs/                    # Architectural roadmaps & developer guides
│   ├── developer-guides/    # Modular developer manuals
│   └── pipeline/            # Technical pipeline & cognitive guides
├── experiments/             # Isolated P6-C visual direction experiments
├── remotion/                # Canonical Remotion compositions & React components
│   ├── components/          # ArabicCaptions, VisualOverlays, NativeVideo
│   ├── Root.tsx             # Root Composition registry
│   └── index.ts             # Remotion entry point
├── schemas/                 # Ajv JSON Schemas for all phase artifacts
├── scripts/                 # Phase runner scripts (p2-run.sh -> p6-run.sh)
└── src/                     # TypeScript pipeline logic (p2, p3, p4, p5, p6)
```
