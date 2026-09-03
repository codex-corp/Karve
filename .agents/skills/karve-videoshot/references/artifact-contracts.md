# Karve VideoShot — Artifact Contracts

This document specifies the exact JSON schemas, required properties, and field semantics for all persistent deliverables generated or consumed by `karve-videoshot`.

---

## 0. `p7-visual-mission.json` (Stage A Input Contract)

In `source_segment` mode, Karve provides this contract to bound the mission without altering upstream artifacts:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "P7VisualMission",
  "type": "object",
  "required": [
    "schema_version",
    "project_id",
    "execution_mode",
    "segment",
    "teaching_goal",
    "evidence_manifest",
    "safe_areas",
    "host_preservation"
  ],
  "properties": {
    "schema_version": { "const": 1 },
    "project_id": { "type": "string" },
    "execution_mode": { "enum": ["source_segment", "standalone_explainer"] },
    "segment": {
      "type": "object",
      "required": [
        "source_start",
        "source_end",
        "output_start",
        "output_end",
        "duration_seconds"
      ],
      "properties": {
        "source_start": { "type": "number", "minimum": 0 },
        "source_end": { "type": "number", "exclusiveMinimum": 0 },
        "output_start": { "type": "number", "minimum": 0 },
        "output_end": { "type": "number", "exclusiveMinimum": 0 },
        "duration_seconds": { "type": "number", "exclusiveMinimum": 0 }
      }
    },
    "transcript_context": {
      "type": "object",
      "required": ["spoken_text"],
      "properties": {
        "spoken_text": { "type": "string" },
        "speaker_id": { "type": "string" }
      }
    },
    "teaching_goal": { "type": "string", "minLength": 10 },
    "evidence_manifest": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "category", "description"],
        "properties": {
          "id": { "type": "string" },
          "category": { "type": "string" },
          "description": { "type": "string" },
          "path_or_uri": { "type": "string" }
        }
      }
    },
    "safe_areas": {
      "type": "object",
      "required": ["caption_bottom_margin_px", "edge_margin_px"],
      "properties": {
        "caption_bottom_margin_px": { "type": "integer", "default": 160 },
        "edge_margin_px": { "type": "integer", "default": 80 }
      }
    },
    "host_preservation": {
      "type": "object",
      "required": ["layout_strategy", "preserve_base_audio"],
      "properties": {
        "layout_strategy": { "enum": ["full", "pip", "side", "bottom", "hidden"] },
        "preserve_base_audio": { "const": true }
      }
    }
  }
}
```

### Rendering & Compositing Differences Between Modes
- **`source_segment`**: Remotion renders the bounded visual overlay; audio and base video remain locked to `rough-cut.mp4` and `timeline-map.json`. Subtitles/captions are overlaid in Karve canonical safe areas (bottom margin $\ge 160\text{px}$). Upstream artifacts are never altered.
- **`standalone_explainer`**: Remotion renders the complete standalone MP4 with internal timing, visual layout, and optional local voiceover audio.

---

## 1. `creative-direction.json` (Stage B)

Defines the conceptual metaphor, flexible spatial zones, visual language, and style tokens.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CreativeDirection",
  "type": "object",
  "required": [
    "narrative_visual_concept",
    "aesthetic_direction",
    "visual_language_rules",
    "anti_patterns",
    "canvas_zones",
    "focal_hierarchy",
    "typography_scale",
    "color_system",
    "technical_representation_choice"
  ],
  "properties": {
    "narrative_visual_concept": { "type": "string", "description": "Core physical or architectural metaphor" },
    "aesthetic_direction": {
      "type": "object",
      "required": ["theme", "background_style", "lighting", "materials"],
      "properties": {
        "theme": { "type": "string" },
        "background_style": { "type": "string" },
        "lighting": { "type": "string" },
        "materials": { "type": "string" }
      }
    },
    "visual_language_rules": { "type": "array", "items": { "type": "string" } },
    "anti_patterns": { "type": "array", "items": { "type": "string" } },
    "canvas_zones": {
      "type": "object",
      "description": "Flexible spatial architecture tailored to the concept (e.g. pipeline, radial, split, or matrix)",
      "additionalProperties": {
        "type": "object",
        "required": ["role", "description"],
        "properties": {
          "role": { "type": "string" },
          "description": { "type": "string" },
          "relative_position": { "type": "string" }
        }
      }
    },
    "focal_hierarchy": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rank", "element", "role", "visual_treatment"],
        "properties": {
          "rank": { "type": "integer" },
          "element": { "type": "string" },
          "role": { "type": "string" },
          "visual_treatment": { "type": "string" }
        }
      }
    },
    "typography_scale": {
      "type": "object",
      "required": ["font_family_mono", "font_family_sans", "sizes"],
      "properties": {
        "font_family_mono": { "type": "string" },
        "font_family_sans": { "type": "string" },
        "sizes": { "type": "object" }
      }
    },
    "color_system": {
      "type": "object",
      "required": [
        "canvas_bg",
        "text_primary",
        "text_secondary",
        "accent_primary",
        "status_positive",
        "status_negative"
      ],
      "properties": {
        "canvas_bg": { "type": "string" },
        "text_primary": { "type": "string" },
        "text_secondary": { "type": "string" },
        "accent_primary": { "type": "string" },
        "accent_secondary": { "type": "string" },
        "surface_card": { "type": "string" },
        "border_card": { "type": "string" },
        "status_positive": { "type": "string" },
        "status_negative": { "type": "string" }
      }
    },
    "technical_representation_choice": {
      "type": "object",
      "required": ["diagram_types", "rationale"],
      "properties": {
        "diagram_types": { "type": "array", "items": { "type": "string" } },
        "rationale": { "type": "string" }
      }
    }
  }
}
```

---

## 2. `storyboard.json` (Stage C)

Defines continuous semantic beats, frame boundaries, and visual jobs.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Storyboard",
  "type": "object",
  "required": ["project", "topic", "total_frames", "fps", "beats"],
  "properties": {
    "project": { "type": "string" },
    "topic": { "type": "string" },
    "total_frames": { "type": "integer" },
    "fps": { "type": "integer" },
    "beats": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "beat_number",
          "id",
          "start_time_seconds",
          "end_time_seconds",
          "start_frame",
          "end_frame",
          "teaching_message",
          "visual_job",
          "primary_visual_focus",
          "objects_visible",
          "continuity_from_previous",
          "transition_intent",
          "why_visual_needed",
          "on_screen_minimal_text"
        ],
        "properties": {
          "beat_number": { "type": "integer" },
          "id": { "type": "string" },
          "start_time_seconds": { "type": "number" },
          "end_time_seconds": { "type": "number" },
          "start_frame": { "type": "integer" },
          "end_frame": { "type": "integer" },
          "teaching_message": { "type": "string" },
          "visual_job": {
            "enum": ["orient", "explain", "demonstrate", "compare", "prove", "emphasize", "transition"]
          },
          "primary_visual_focus": { "type": "string" },
          "objects_visible": { "type": "array", "items": { "type": "string" } },
          "continuity_from_previous": { "type": "string" },
          "transition_intent": { "type": "string" },
          "why_visual_needed": { "type": "string" },
          "on_screen_minimal_text": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 3. `visual-spec.json` (Stage D)

Implementation-grade geometry, flexible coordinate positioning, and typography tokens.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VisualSpec",
  "type": "object",
  "required": [
    "canvas",
    "layout_zones",
    "typography",
    "color_palette",
    "data_topology",
    "safe_areas"
  ],
  "properties": {
    "canvas": {
      "type": "object",
      "required": ["width", "height", "fps", "total_frames", "background_color"],
      "properties": {
        "width": { "type": "integer" },
        "height": { "type": "integer" },
        "fps": { "type": "integer" },
        "total_frames": { "type": "integer" },
        "background_color": { "type": "string" },
        "grid_pattern": { "type": "string" }
      }
    },
    "layout_zones": {
      "type": "object",
      "description": "Concrete bounds for all spatial zones defined in Creative Direction",
      "additionalProperties": {
        "type": "object",
        "required": ["x", "y", "width", "height"],
        "properties": {
          "x": { "type": "number" },
          "y": { "type": "number" },
          "width": { "type": "number" },
          "height": { "type": "number" }
        }
      }
    },
    "typography": { "type": "object" },
    "color_palette": { "type": "object" },
    "data_topology": {
      "type": "object",
      "required": ["nodes", "edges"],
      "properties": {
        "nodes": { "type": "array" },
        "edges": { "type": "array" }
      }
    },
    "component_styling": { "type": "object" },
    "safe_areas": {
      "type": "object",
      "required": ["caption_bottom_margin_px"],
      "properties": {
        "caption_bottom_margin_px": { "type": "integer" }
      }
    }
  }
}
```

---

## 4. `motion-spec.json` (Stage E)

Deterministic frame ranges, cubic-bezier easings, and interpolation recipes.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MotionSpec",
  "type": "object",
  "required": ["composition", "global_easing_tokens", "element_animations"],
  "properties": {
    "composition": {
      "type": "object",
      "required": ["name", "total_frames", "fps"],
      "properties": {
        "name": { "type": "string" },
        "total_frames": { "type": "integer" },
        "fps": { "type": "integer" }
      }
    },
    "global_easing_tokens": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "element_animations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "element_id",
          "beat_id",
          "property",
          "frame_range",
          "easing",
          "remotion_interpolation",
          "pedagogical_purpose"
        ],
        "properties": {
          "element_id": { "type": "string" },
          "beat_id": { "type": "string" },
          "property": { "type": "string" },
          "frame_range": {
            "type": "array",
            "items": { "type": "integer" },
            "minItems": 2,
            "maxItems": 2
          },
          "easing": { "type": "string" },
          "remotion_interpolation": {
            "type": "object",
            "required": ["input_range", "output_range", "extrapolate"],
            "properties": {
              "input_range": { "type": "array" },
              "output_range": { "type": "array" },
              "extrapolate": { "type": "string" }
            }
          },
          "pedagogical_purpose": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 5. `qa-v1.json` & `qa-final.json` (Stages H & I)

Evaluation against the 7 Quality Pillars, categorized defect logs, and verification status.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VisualQA",
  "type": "object",
  "required": [
    "version",
    "timestamp",
    "reviewer_role",
    "evaluated_artifacts",
    "assessment_criteria",
    "verdict"
  ],
  "properties": {
    "version": { "enum": ["v1", "final"] },
    "timestamp": { "type": "string" },
    "reviewer_role": { "type": "string" },
    "evaluated_artifacts": {
      "type": "object",
      "required": ["video", "stills"],
      "properties": {
        "video": { "type": "string" },
        "stills": { "type": "array", "items": { "type": "string" } }
      }
    },
    "assessment_criteria": {
      "type": "object",
      "required": [
        "immediate_comprehension",
        "composition_and_spacing",
        "focal_hierarchy",
        "semantic_correctness",
        "graphical_craftsmanship",
        "motion_clarity_and_pacing",
        "professional_polish"
      ],
      "additionalProperties": {
        "type": "object",
        "required": ["score", "notes"],
        "properties": {
          "score": { "type": "number", "minimum": 1, "maximum": 10 },
          "notes": { "type": "string" }
        }
      }
    },
    "highest_impact_problems": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "severity", "classification", "title", "description"],
        "properties": {
          "id": { "type": "string" },
          "severity": { "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          "classification": {
            "enum": ["SEMANTIC", "LAYOUT", "COLLISION", "MOTION", "PRECISION", "TYPOGRAPHY", "ASSET"]
          },
          "title": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "corrections_verified": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["issue_id", "status", "verification"],
        "properties": {
          "issue_id": { "type": "string" },
          "status": { "enum": ["RESOLVED", "PARTIAL", "UNRESOLVED"] },
          "verification": { "type": "string" }
        }
      }
    },
    "remaining_visible_weaknesses": {
      "type": "array",
      "items": { "type": "string" }
    },
    "verdict": { "enum": ["PASS", "NEEDS_TARGETED_IMPROVEMENT", "FAIL"] }
  }
}
```

---

## 6. `skill-usage.json` (Stage J / Persistent Audit)

Maintained across all stages to prove compliance with real installed skills.

```json
[
  {
    "stage": "Creative Direction",
    "bifrost_model": "bedrock/qwen.qwen3-235b-a22b-2507-v1:0",
    "skill_requested": "ui-styling",
    "skill_files_actually_read": [
      "SKILL.md",
      "references/canvas-design-system.md"
    ],
    "tool_call_ids": [
      "call_qwen_stage1_001",
      "call_qwen_stage1_002"
    ],
    "timestamp": "2026-09-03T10:45:12.345Z"
  }
]
```
