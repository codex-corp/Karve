export type P7Profile = "source" | "reel" | "youtube";

export type P7VisualMode =
  | "technical_explainer"
  | "tutorial"
  | "talking_head"
  | "voiceover_explainer";

export type P7VisualJob =
  | "orient"
  | "explain"
  | "demonstrate"
  | "compare"
  | "prove"
  | "emphasize"
  | "transition";

export type RepresentationKind =
  | "data_chart"
  | "metric"
  | "architecture_diagram"
  | "process_flow"
  | "comparison"
  | "timeline"
  | "code"
  | "terminal"
  | "real_ui"
  | "screenshot_annotation"
  | "concept_diagram"
  | "relationship_diagram"
  | "evidence_card"
  | "host_layout"
  | "transition"
  | "emphasis";

export type AdaptationMode = "reuse" | "adapt" | "compose" | "custom";

export type HostLayoutType = "full" | "pip" | "side" | "bottom" | "hidden";

export type ClaimType =
  | "factual_technical"
  | "derived_explanation"
  | "neutral_conceptual";

export type FactualCategory =
  | "real_ui"
  | "real_code"
  | "api"
  | "metrics_data"
  | "product_capability"
  | "quote"
  | "exact_technical_claim"
  | "brand_asset";

export type P7Segment = {
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
  duration_seconds: number;
};

export type EvidenceItem = {
  id: string;
  category: FactualCategory;
  description: string;
  path_or_uri?: string;
  sha256?: string;
};

export type OutputSandbox = {
  allowed_output_root: string;
  forbidden_paths: string[];
};

export type ScopeRules = {
  max_duration_seconds: number;
  allow_artifact_mutation: false;
  forbidden_mutations: string[];
};

export type VisualMissionArtifacts = {
  source_metadata: string;
  transcript: string;
  rough_cut_video: string;
  rough_cut_plan: string;
  timeline_map: string;
  presentation_plan: string;
  caption_corrections?: string;
};

export type VisualMission = {
  schema_version: 1;
  project_id: string;
  profile: P7Profile;
  mode: P7VisualMode;
  style_profile?: string;
  segment: P7Segment;
  artifacts: VisualMissionArtifacts;
  evidence_manifest: EvidenceItem[];
  output_sandbox: OutputSandbox;
  scope_rules: ScopeRules;
};

export type HostLayoutSpec = {
  layout: HostLayoutType;
  transition_duration_seconds?: number;
  notes?: string;
};

export type GroundingSpec = {
  claim_type: ClaimType;
  factual_category?: FactualCategory;
  evidence_refs?: string[];
  neutral_fallback?: string;
  notes?: string;
};

export type RecipeSearch = {
  representation_kind: RepresentationKind;
  candidate_refs: string[];
  selected_ref: string;
};

export type VisualBeat = {
  id: string;
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
  message: string;
  visual_job: P7VisualJob;
  why_visual_needed: string;
  host_layout: HostLayoutSpec;
  recipe_or_component: string[];
  recipe_search: RecipeSearch;
  adaptation_mode: AdaptationMode;
  selection_reason: string;
  custom_reason?: string;
  reference_basis?: string[];
  timing_anchor?: string;
  display_text?: string;
  grounding: GroundingSpec;
};

export type HostStrategy = {
  default_layout: HostLayoutType;
  evidence_rule: string;
  caption_rule: string;
};

export type AssetPolicy = {
  allowed: string;
  prohibited: string;
};

export type VisualPlan = {
  schema_version: 1;
  project_id: string;
  profile: P7Profile;
  mode: P7VisualMode;
  style_profile?: string;
  narrative_arc?: string;
  segment: P7Segment;
  overall_teaching_goal: string;
  key_points: string[];
  host_strategy: HostStrategy;
  asset_policy: AssetPolicy;
  beats: VisualBeat[];
};
