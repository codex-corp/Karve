# Visual Director: Cognitive Process & Decision Architecture

## 1. Introduction & Philosophy

The role of the **Visual Director (P6-C)** in Karve is not to create a random motion slideshow or decorate every word. It is to **enhance human comprehension** of spoken ideas by translating semantic beats into continuous, truthful, and focused visual representations.

This document details the exact cognitive and architectural steps executed to understand, design, and render the visual direction for `tech-test-01`.

---

## 2. Step 1: Deep Semantic Comprehension & Segment Selection

### Analyzing the Raw Transcript:
When Faster-Whisper produced the transcript for `tech-test-01`:
> «أطيب تحياتي وأهلاً وسهلاً بكم. كلياتنا بنستخدم، أنا بعرف هلأ في حدا بيقل لي كلو هاد أنا برأيي هو إضافات على ما يفعله. واليوم أطلقت ميزة هي تضمين داخل واتساب وتيليجرام. أنا بستخدم واتساب بشكل مستمر ولكن اكتشفت انه هو عالم كتير كبير وبدأت باستخدامه. وهلأ مع بتوقع انه لح يصير لسه الموضوع أفضل وأفضل. خلينا نشوف مباشرة كيف بقدر.»

### Identifying the Narrative Arc & Semantic Beats:
We broke the audio stream into distinct communicative blocks:
1. **`0.00s -> 12.82s` (Intro & Context):** General greeting and conversational opening remarks. Does not require complex diagrams.
2. **`12.82s -> 19.40s` (Beat 1 — Feature Announcement):** Announces an integration capability embedded inside WhatsApp and Telegram.
3. **`19.40s -> 24.96s` (Beat 2 — Discovery & Scope):** Personal reflection on using WhatsApp daily, then realizing it connects to a much broader ecosystem («عالم كتير كبير»).
4. **`24.96s -> 29.50s` (Beat 3 — Value Proposition):** Optimism regarding ongoing improvement («أفضل وأفضل»).
5. **`29.50s -> 31.92s` (Beat 4 — Call to Action / Demo Handoff):** Direct verbal transition into a live demo («خلينا نشوف مباشرة كيف بقدر»).

### Why `12.82s -> 31.92s` Was Chosen:
This 19.10-second slice contains a complete technical teaching arc: **Platform Integration ➔ Ecosystem Expansion ➔ Value Expectation ➔ Demo Transition**. It presents rich visual opportunities without wasting visual budgets on non-technical greetings.

---

## 3. Step 2: Visual Scene Strategy & Host Layout (Zero Churn)

A common flaw in AI-generated video is **layout jitter** (e.g. Host Full ➔ Card ➔ Host Full ➔ Chip ➔ Card). We established strict cinematography rules:

```text
[12.82s - 14.68s]  Host Full Frame (Relationship anchor)
        │
[14.68s - 15.08s]  Single Smooth Yield (Host transitions into 16:9 bottom-right PiP)
        │
[15.08s - 24.96s]  Continuous Shared Scene (Beats 1 & 2 develop on the same stage)
        │            • Beat 1: Core connects to WhatsApp & Telegram
        │            • Beat 2: Core expands into surrounding ecosystem nodes
        │
[24.96s - 25.36s]  Single Smooth Restoration (Host returns to full frame)
        │
[25.36s - 31.92s]  Host Full Frame (Maintains primary human connection through CTA)
```

### Why a 16:9 Rounded-Rectangle PiP?
In Revision 1, a circular chip was tested. However, because the input was standard webcam footage without an alpha matte, the circular mask awkwardly cropped the speaker's shoulders and microphone. We switched to a **320x180 (16:9) rounded rectangle PiP** with an 18px border radius, subtle dark border, and deep shadow. This preserved the speaker's natural frame and looked broadcast-ready.

---

## 4. Step 3: Preventing Semantic Hallucinations

### The Problem:
In initial drafts, AI models often invent specific feature names to fill visual diagrams (e.g., adding labels like `Webhook Automation`, `AI Agents`, `REST API`). If the speaker did not mention these specific technologies, doing so constitutes a **semantic visual hallucination**.

### The Solution:
We enforced **strict evidence grounding**:
- **Mentioned Entities:** WhatsApp and Telegram were explicitly named, so official vector brand badges (`#25D366` and `#229ED9`) were highlighted.
- **Abstract Concepts:** The speaker said «عالم كتير كبير» (a very large ecosystem). Instead of inventing specific products, we used grounded, neutral ecosystem nodes:
  - `تكاملات وخدمات` (Connected Services)
  - `إمكانيات أوسع` (Expanded Capabilities)
  - `تطبيقات متصلة` (Connected Apps)
- **Value Proposition (Beat 3):** Changed from speculative phrases like `تطور وتحسين مستمر` to the exact spoken phrase: **`أفضل وأفضل ✨`**.

---

## 5. Step 4: Typography, Easing, and Caption Layer Isolation

1. **Eliminating English Micro-labels:**
   Templates often inject English subheaders (e.g., `EMBEDDED CORE`, `LIVE DEMO`). For an authentic Arabic tech explainer, these were removed to maintain pure, balanced Arabic typography using `Noto Sans Arabic`.
2. **Absolute Caption Invariance:**
   Visual accents (`ValueAccentIndicator`, `DirectionalHandoffCue`) were positioned in the top-left upper safe zone (`top: 44px, left: 56px`), completely outside the face and caption safe areas. The accepted P6 captions rendered on the top layer with 100% untouched timing, pagination, and styling.
3. **Conditional Handoff (Beat 4):**
   Because no second screen-recording asset was supplied, we avoided inventing a fake user interface or empty wireframe. Instead, a clean directional handoff glyph (`انتقال إلى التطبيق المباشر ➔`) was displayed, respecting visual truthfulness.

---

## 6. Summary of Architectural Impact

The experiment proved that a lightweight, bounded visual director workflow can take an existing Karve rough-cut, transcript, and timeline map, produce an isolated Remotion composition, and generate publication-quality motion graphics without modifying the upstream pipeline.
