import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export type ValidationContext = {
  projectId: string;
  sourceDurationSeconds: number;
  transcriptSegmentIds: Set<number>;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

type TimelineRange = {
  action?: unknown;
  start?: unknown;
  end?: unknown;
  reason_code?: unknown;
  evidence_segment_ids?: unknown;
};

type VisualIntent = {
  start?: unknown;
  end?: unknown;
};

function overlapSeconds(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function schemaValidate(plan: unknown, schemaPath: string): string[] {
  const dir = mkdtempSync(join(tmpdir(), "karve-p4-validate-"));
  const planPath = join(dir, "plan.json");

  try {
    writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    const result = spawnSync(
      "ajv",
      ["validate", "--spec=draft2020", "-s", schemaPath, "-d", planPath],
      { encoding: "utf8" }
    );

    if (result.error) {
      return [`AJV execution failed: ${result.error.message}`];
    }

    if (result.status !== 0) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
      return [output || `AJV exited with status ${String(result.status)}`];
    }

    return [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function validateEditPlan(
  plan: unknown,
  schemaPath: string,
  context: ValidationContext
): ValidationResult {
  const errors = schemaValidate(plan, schemaPath);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const object = plan as {
    schema_version: number;
    project_id: string;
    source_duration_seconds: number;
    decisions: TimelineRange[];
    visual_intents: VisualIntent[];
  };

  if (object.project_id !== context.projectId) {
    errors.push(
      `project_id mismatch: expected ${context.projectId}, got ${object.project_id}`
    );
  }

  if (Math.abs(object.source_duration_seconds - context.sourceDurationSeconds) > 0.001) {
    errors.push(
      `source_duration_seconds mismatch: expected ${context.sourceDurationSeconds}, got ${object.source_duration_seconds}`
    );
  }

  const decisions = object.decisions.map((decision, index) => {
    const start = Number(decision.start);
    const end = Number(decision.end);

    if (!(start < end)) {
      errors.push(`decisions[${index}] must have start < end`);
    }

    if (start < 0 || end > context.sourceDurationSeconds + 0.05) {
      errors.push(
        `decisions[${index}] is outside source bounds 0..${context.sourceDurationSeconds}`
      );
    }

    if (decision.reason_code === "uncertain_asr" && decision.action === "remove") {
      errors.push(
        `decisions[${index}] cannot remove content solely because ASR is uncertain`
      );
    }

    if (Array.isArray(decision.evidence_segment_ids)) {
      for (const rawId of decision.evidence_segment_ids) {
        const id = Number(rawId);
        if (!context.transcriptSegmentIds.has(id)) {
          errors.push(`decisions[${index}] references unknown transcript segment ${id}`);
        }
      }
    }

    return {
      index,
      action: String(decision.action),
      start,
      end
    };
  });

  for (let i = 0; i < decisions.length; i += 1) {
    for (let j = i + 1; j < decisions.length; j += 1) {
      const a = decisions[i];
      const b = decisions[j];
      const overlap = overlapSeconds(a.start, a.end, b.start, b.end);
      if (overlap <= 0.05) {
        continue;
      }

      if (a.action !== b.action) {
        errors.push(
          `decisions[${a.index}] and decisions[${b.index}] conflict by overlapping ${overlap.toFixed(3)}s with different actions`
        );
      } else if (a.action === "remove") {
        errors.push(
          `remove decisions[${a.index}] and decisions[${b.index}] overlap by ${overlap.toFixed(3)}s; return non-overlapping ranges`
        );
      }
    }
  }

  const removeRanges = decisions.filter((decision) => decision.action === "remove");
  object.visual_intents.forEach((intent, index) => {
    const start = Number(intent.start);
    const end = Number(intent.end);

    if (!(start < end)) {
      errors.push(`visual_intents[${index}] must have start < end`);
    }

    if (start < 0 || end > context.sourceDurationSeconds + 0.05) {
      errors.push(
        `visual_intents[${index}] is outside source bounds 0..${context.sourceDurationSeconds}`
      );
    }

    for (const remove of removeRanges) {
      const overlap = overlapSeconds(start, end, remove.start, remove.end);
      if (overlap > 0.05) {
        errors.push(
          `visual_intents[${index}] overlaps remove decisions[${remove.index}] by ${overlap.toFixed(3)}s`
        );
      }
    }
  });

  return { ok: errors.length === 0, errors };
}
