# Karve Visual & Motion Design System

## 1. Design Philosophy
Karve enforces a **dark luxury aesthetic** inspired by the Apple Design Paradigm: clean typography, deep dark glass surfaces (`rgba(15, 23, 42, 0.92)`), subtle borders (`1px solid rgba(255, 255, 255, 0.12)`), purposeful motion, and zero visual clutter.

---

## 2. Color Palette & Tokens

| Token Name | Hex / RGBA | Usage |
|---|---|---|
| `--color-canvas-bg` | `#060911` | Deep base canvas background |
| `--color-card-bg` | `rgba(15, 23, 42, 0.92)` | Glassmorphism cards with `backdropFilter: blur(14px)` |
| `--color-gold-accent` | `#FFD54A` | Active word highlighting & primary emphasis |
| `--color-core-indigo` | `#6366F1` | Tech core / engine nodes & active borders |
| `--color-wa-green` | `#25D366` | Verified official WhatsApp brand elements |
| `--color-tg-cyan` | `#229ED9` | Verified official Telegram brand elements |
| `--color-text-primary` | `#FFFFFF` | Primary headers, active words, body text |
| `--color-text-muted` | `rgba(255, 255, 255, 0.65)` | Subheaders, metadata, timestamps |

---

## 3. Typography Rules

* **Primary Font Family:** `"Noto Sans Arabic", "Inter", -apple-system, sans-serif`
* **Text Direction:** `dir="rtl"` for Arabic content; inline tokens for mixed English/technical words.
* **Font Sizing by Resolution:**
  - `720p (1280x720)`: Captions `48px`, Badges `16-20px`, Subtitles `12-14px`.
  - `1080p (1920x1080)`: Captions `68px`, Badges `24-28px`, Subtitles `16-18px`.
  - `Reel (1080x1920)`: Captions `64px` (max width 84%, safe margin bottom 280px for social UI).

---

## 4. Safe Areas & Layout Geometry

```text
┌────────────────────────────────────────────────────────┐
│  [Top Safe Zone (44px from top, 56px from left)]       │
│  • Value indicators (أفضل وأفضل)                       │
│  • Directional cues (انتقال إلى التطبيق المباشر)        │
│                                                        │
│             [Center-Left: Diagram / Visual Stage]      │
│                                                        │
│                          ┌───────────────────────────┐ │
│                          │  Host PiP (16:9)          │ │
│                          │  320x180px, r: 18px       │ │
│                          │  right: 48px, bottom: 48px│ │
│  [Bottom Caption Safe Zone (Bottom 25%)] ────────────┘ │
│  • Arabic captions (max-width 84%, RTL)                │
└────────────────────────────────────────────────────────┘
```

* **Face Safe Area:** Central/upper quadrants must never be obscured when host is full-frame.
* **Caption Safe Area:** Bottom 25% is reserved strictly for captions. No diagrams or cards may cross this boundary.

---

## 5. Host Layout Standards (PiP & Yields)

* **Form Factor:** 16:9 rounded rectangle (`320x180` in 720p, `480x270` in 1080p).
* **Transition Duration:** Exactly `0.4s` (12 frames @ 30fps).
* **Easing Function:** Cubic smoothstep ($y = 3x^2 - 2x^3$).
* **Layout Rule:** Max **1 yield** and **1 restoration** per visual segment. Zero layout jitter.
