export type CanvasDimensions = {
  width: number;
  height: number;
};

export const REFERENCE_CANVAS: CanvasDimensions = {
  width: 1920,
  height: 1080
};

export type TypographyScale = {
  title: number;
  headline: number;
  subhead: number;
  body: number;
  caption: number;
  micro: number;
};

export type TypographyWeights = {
  regular: number;
  medium: number;
  bold: number;
};

export type LineHeights = {
  tight: number;
  normal: number;
  relaxed: number;
};

export type TypographyTokens = {
  font_family_arabic: string;
  font_family_latin: string;
  font_family_code: string;
  scale: TypographyScale;
  weights: TypographyWeights;
  line_heights: LineHeights;
};

export type ColorTokens = {
  background: string;
  canvas_dark: string;
  card_surface: string;
  card_surface_elevated: string;
  card_border: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  accent_primary: string;       // Single primary brand/visual accent
  semantic_positive: string;   // Data/status positive indicator
  semantic_negative: string;   // Data/status negative/danger indicator
};

export type SpacingTokens = {
  unit: number;
  padding_card: number;
  gap_elements: number;
  margin_section: number;
};

export type RadiusTokens = {
  card: number;
  badge: number;
  pip: number;
};

export type StrokeTokens = {
  diagram_line: number;
  card_border: number;
  emphasis_halo: number;
};

export type HostPipTokens = {
  aspect_ratio: "16:9";
  width_px: number;
  height_px: number;
  border_width: number;
  border_color: string;
  shadow: string;
  corner_radius: number;
};

export type MotionTokens = {
  transition_fast_seconds: number;
  transition_normal_seconds: number;
  transition_slow_seconds: number;
  easing: string;
};

export type SafeAreaTokens = {
  caption_bottom_margin_px: number;
  host_exclusion_margin_px: number;
};

export type StyleProfile = {
  id: string;
  version: 1;
  description: string;
  reference_canvas: CanvasDimensions;
  typography: TypographyTokens;
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  stroke: StrokeTokens;
  host_pip: HostPipTokens;
  motion: MotionTokens;
  safe_areas: SafeAreaTokens;
};

export type ScaledStyleTokens = StyleProfile & {
  target_canvas: CanvasDimensions;
  scale_factor: number;
};

export const KARVE_TECHNICAL_V1: StyleProfile = {
  id: "karve-technical-v1",
  version: 1,
  description: "Karve Technical Explainer v1 — 1920x1080 reference canvas, video-scale Arabic typography, focused single accent with semantic status colors, and responsive 16:9 host PiP",
  reference_canvas: REFERENCE_CANVAS,
  typography: {
    font_family_arabic: "Noto Sans Arabic, sans-serif",
    font_family_latin: "Inter, sans-serif",
    font_family_code: "JetBrains Mono, monospace",
    // Base values calibrated for 1920x1080 video composition (NOT desktop web UI)
    scale: {
      title: 72,
      headline: 52,
      subhead: 38,
      body: 28,
      caption: 22,
      micro: 18
    },
    weights: {
      regular: 400,
      medium: 500,
      bold: 700
    },
    line_heights: {
      tight: 1.2,
      normal: 1.45,
      relaxed: 1.65
    }
  },
  colors: {
    background: "#080C14",
    canvas_dark: "#0F172A",
    card_surface: "rgba(30, 41, 59, 0.88)",
    card_surface_elevated: "rgba(51, 65, 85, 0.92)",
    card_border: "rgba(148, 163, 184, 0.25)",
    text_primary: "#F8FAFC",
    text_secondary: "#CBD5E1",
    text_muted: "#94A3B8",
    accent_primary: "#38BDF8",       // Single primary visual accent (Sky 400)
    semantic_positive: "#34D399",    // Semantic positive (Emerald 400)
    semantic_negative: "#F87171"     // Semantic negative (Red 400)
  },
  spacing: {
    unit: 4,
    padding_card: 32,
    gap_elements: 24,
    margin_section: 48
  },
  radius: {
    card: 20,
    badge: 10,
    pip: 22
  },
  stroke: {
    diagram_line: 3.5,
    card_border: 2,
    emphasis_halo: 4
  },
  host_pip: {
    aspect_ratio: "16:9",
    width_px: 480,
    height_px: 270,
    border_width: 3,
    border_color: "rgba(255, 255, 255, 0.25)",
    shadow: "0 12px 40px rgba(0, 0, 0, 0.65)",
    corner_radius: 22
  },
  motion: {
    transition_fast_seconds: 0.2,
    transition_normal_seconds: 0.4,
    transition_slow_seconds: 0.8,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  safe_areas: {
    caption_bottom_margin_px: 160,
    host_exclusion_margin_px: 240
  }
};

export const STYLE_PROFILES: Record<string, StyleProfile> = {
  "karve-technical-v1": KARVE_TECHNICAL_V1
};

export function getStyleProfile(profileId = "karve-technical-v1"): StyleProfile {
  const profile = STYLE_PROFILES[profileId];
  if (!profile) {
    throw new Error(`Unknown visual style profile '${profileId}'. Available: ${Object.keys(STYLE_PROFILES).join(", ")}`);
  }
  return profile;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeScaleFactor(
  canvas: CanvasDimensions,
  reference: CanvasDimensions = REFERENCE_CANVAS
): number {
  const isVertical = canvas.height > canvas.width;
  if (isVertical) {
    // For vertical profiles (e.g. 1080x1920 reels), scale by width with mobile readability boost
    const widthScale = (canvas.width / reference.width) * 1.35;
    return clamp(widthScale, 0.75, 1.8);
  }
  // Landscape profiles (1920x1080 -> 1.0, 1280x720 -> 0.667)
  const landscapeScale = Math.min(
    canvas.width / reference.width,
    canvas.height / reference.height
  );
  return clamp(landscapeScale, 0.6, 2.0);
}

export function resolveStyleTokens(
  profile: StyleProfile,
  canvas: CanvasDimensions
): ScaledStyleTokens {
  const s = computeScaleFactor(canvas, profile.reference_canvas);

  // Scaled typography with sensible mobile minimum clamps
  const scaleTitle = Math.round(clamp(profile.typography.scale.title * s, 36, 140));
  const scaleHeadline = Math.round(clamp(profile.typography.scale.headline * s, 28, 96));
  const scaleSubhead = Math.round(clamp(profile.typography.scale.subhead * s, 22, 64));
  const scaleBody = Math.round(clamp(profile.typography.scale.body * s, 18, 48));
  const scaleCaption = Math.round(clamp(profile.typography.scale.caption * s, 15, 36));
  const scaleMicro = Math.round(clamp(profile.typography.scale.micro * s, 13, 28));

  // Scaled PiP dimensions
  const pipWidth = Math.round(clamp(profile.host_pip.width_px * s, 240, 720));
  const pipHeight = Math.round(pipWidth * (9 / 16));

  return {
    ...profile,
    target_canvas: canvas,
    scale_factor: s,
    typography: {
      ...profile.typography,
      scale: {
        title: scaleTitle,
        headline: scaleHeadline,
        subhead: scaleSubhead,
        body: scaleBody,
        caption: scaleCaption,
        micro: scaleMicro
      }
    },
    spacing: {
      unit: profile.spacing.unit,
      padding_card: Math.round(profile.spacing.padding_card * s),
      gap_elements: Math.round(profile.spacing.gap_elements * s),
      margin_section: Math.round(profile.spacing.margin_section * s)
    },
    radius: {
      card: Math.round(profile.radius.card * s),
      badge: Math.round(profile.radius.badge * s),
      pip: Math.round(profile.radius.pip * s)
    },
    stroke: {
      diagram_line: Number((profile.stroke.diagram_line * s).toFixed(1)),
      card_border: Number((profile.stroke.card_border * s).toFixed(1)),
      emphasis_halo: Number((profile.stroke.emphasis_halo * s).toFixed(1))
    },
    host_pip: {
      ...profile.host_pip,
      width_px: pipWidth,
      height_px: pipHeight,
      border_width: Math.max(1, Math.round(profile.host_pip.border_width * s)),
      corner_radius: Math.round(profile.host_pip.corner_radius * s)
    },
    safe_areas: {
      caption_bottom_margin_px: Math.round(profile.safe_areas.caption_bottom_margin_px * s),
      host_exclusion_margin_px: Math.round(profile.safe_areas.host_exclusion_margin_px * s)
    }
  };
}
