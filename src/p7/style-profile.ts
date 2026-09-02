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
  accent_primary: string;
  accent_secondary: string;
  accent_highlight: string;
  danger: string;
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
  typography: TypographyTokens;
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  stroke: StrokeTokens;
  host_pip: HostPipTokens;
  motion: MotionTokens;
  safe_areas: SafeAreaTokens;
};

export const KARVE_TECHNICAL_V1: StyleProfile = {
  id: "karve-technical-v1",
  version: 1,
  description: "Karve Technical Explainer profile v1 — clean dark canvas, high contrast Noto Arabic typography, and 16:9 native host PiP",
  typography: {
    font_family_arabic: "Noto Sans Arabic, sans-serif",
    font_family_latin: "Inter, sans-serif",
    font_family_code: "JetBrains Mono, monospace",
    scale: {
      title: 36,
      headline: 28,
      subhead: 22,
      body: 18,
      caption: 15,
      micro: 12
    },
    weights: {
      regular: 400,
      medium: 500,
      bold: 700
    },
    line_heights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7
    }
  },
  colors: {
    background: "#080C14",
    canvas_dark: "#0F172A",
    card_surface: "rgba(30, 41, 59, 0.85)",
    card_surface_elevated: "rgba(51, 65, 85, 0.9)",
    card_border: "rgba(148, 163, 184, 0.2)",
    text_primary: "#F8FAFC",
    text_secondary: "#CBD5E1",
    text_muted: "#94A3B8",
    accent_primary: "#38BDF8",     // sky blue
    accent_secondary: "#34D399",   // emerald
    accent_highlight: "#FBBF24",   // amber
    danger: "#F87171"
  },
  spacing: {
    unit: 4,
    padding_card: 24,
    gap_elements: 16,
    margin_section: 32
  },
  radius: {
    card: 16,
    badge: 8,
    pip: 18
  },
  stroke: {
    diagram_line: 2.5,
    card_border: 1.5,
    emphasis_halo: 3
  },
  host_pip: {
    aspect_ratio: "16:9",
    width_px: 320,
    height_px: 180,
    border_width: 2,
    border_color: "rgba(255, 255, 255, 0.2)",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
    corner_radius: 18
  },
  motion: {
    transition_fast_seconds: 0.2,
    transition_normal_seconds: 0.4,
    transition_slow_seconds: 0.8,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  safe_areas: {
    caption_bottom_margin_px: 120,
    host_exclusion_margin_px: 200
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
