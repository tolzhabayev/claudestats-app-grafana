import { LABELS } from '../constants';

/**
 * An extra label every panel can be filtered by, with the template variable
 * that holds its selection.
 */
export interface FilterDimension {
  /** Prometheus label name, e.g. `vcs_repository_name` or `project`. */
  label: string;
  /** Template variable name, e.g. `repository` or `label_project`. */
  variable: string;
  /** Picker label shown above the panels. */
  title: string;
  /**
   * Hide the picker while the label has no values. Used for the built-in
   * Repository filter, which only exists when Claude Code sends repository
   * attributes; labels an admin configures are always shown.
   */
  hideWhenEmpty: boolean;
}

/** Built-in Repository filter (`OTEL_METRICS_INCLUDE_REPOSITORY=true`). */
export const REPOSITORY_DIMENSION: FilterDimension = {
  label: LABELS.REPOSITORY,
  variable: 'repository',
  title: 'Repository',
  hideWhenEmpty: true,
};

// Labels the app already filters or groups by; configuring them again would clash.
const RESERVED_LABELS = new Set<string>([
  LABELS.USER_EMAIL,
  LABELS.ENDUSER_ID,
  LABELS.USER_ID,
  LABELS.MEMBER,
  LABELS.MODEL,
  LABELS.REPOSITORY,
  '__name__',
]);

/**
 * Turns an OTel attribute name into the Prometheus label it becomes
 * (`team.id` -> `team_id`). Returns null when the result isn't a valid label name.
 */
export function toLabelName(attribute: string): string | null {
  const label = attribute.trim().replace(/[.\-/ ]/g, '_');
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label) && !label.startsWith('__') ? label : null;
}

/** Whether a configured label can be used as a filter. */
export function isUsableCustomLabel(attribute: string): boolean {
  const label = toLabelName(attribute);
  return label !== null && !RESERVED_LABELS.has(label);
}

/**
 * The filters every query applies: Repository first, then the labels configured
 * on the app's configuration page (invalid, reserved and duplicate ones dropped).
 */
export function getFilterDimensions(customLabels: string[] = []): FilterDimension[] {
  const seen = new Set<string>();
  const custom: FilterDimension[] = [];
  for (const attribute of customLabels) {
    const label = toLabelName(attribute);
    if (!label || RESERVED_LABELS.has(label) || seen.has(label)) {
      continue;
    }
    seen.add(label);
    custom.push({ label, variable: `label_${label}`, title: attribute.trim(), hideWhenEmpty: false });
  }
  return [REPOSITORY_DIMENSION, ...custom];
}
