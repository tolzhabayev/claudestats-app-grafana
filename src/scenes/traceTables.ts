import type { CustomTransformOperator, DataFrame, Field } from '@grafana/data';
import { map } from 'rxjs';

export interface Column {
  /** Field name in Tempo's table frame. */
  name: string;
  /** Without one, the field is kept as it is (used for the nested spans). */
  displayName?: string;
  /** Unit to show, when the field has none or a better one. */
  unit?: string;
  /** Minimum column width in pixels. The table's default (150) pushes columns out of view. */
  minWidth?: number;
}

/** Month, day and time: the year adds nothing and the full timestamp doesn't fit. */
const START_TIME = 'time:MM-DD HH:mm';

/**
 * The Model Requests columns, in order. Tempo's span table also returns the
 * trace's service and name, the span ID, every attribute the query mentions
 * (including the member filter's `user.email` and `user.id`) and the trace ID
 * hidden; this keeps what the panel is for and shows the trace ID so it can be
 * clicked.
 */
const MODEL_REQUEST_COLUMNS: Column[] = [
  { name: 'time', displayName: 'Start time', unit: START_TIME, minWidth: 100 },
  { name: 'model', displayName: 'Model', minWidth: 150 },
  // Time to first token
  { name: 'ttft_ms', displayName: 'First token', unit: 'ms', minWidth: 95 },
  // Tempo's own span duration, in nanoseconds
  { name: 'duration', displayName: 'Duration', unit: 'ns', minWidth: 85 },
  { name: 'stop_reason', displayName: 'Stop reason', minWidth: 100 },
  { name: 'traceIdHidden', displayName: 'Trace ID', minWidth: 100 },
];

/**
 * Keeps only `columns` of each frame, in that order, with fresh display
 * settings: a display name, a unit, a minimum width, nothing hidden, and an
 * empty cell for a missing value. The fresh config also keeps the panel's "no traces" text out
 * of empty cells, since a field's own `noValue` wins over the panel default.
 */
export function pickColumns(frames: DataFrame[], columns: Column[]): DataFrame[] {
  return frames.map((frame) => {
    const fields: Field[] = [];
    for (const column of columns) {
      const field = frame.fields.find((f) => f.name === column.name);
      if (!field) {
        continue;
      }
      if (column.displayName === undefined) {
        fields.push(field);
        continue;
      }
      fields.push({
        ...field,
        config: {
          displayName: column.displayName,
          unit: column.unit ?? field.config.unit,
          noValue: field.config.noValue ?? '',
          custom: column.minWidth ? { minWidth: column.minWidth } : {},
        },
      });
    }
    return { ...frame, fields };
  });
}

/**
 * The Interactions columns. The service and trace name are the same on every
 * row (`claude-code`, `claude_code.interaction`), so they're dropped to keep
 * the duration in view. `nested` holds each trace's spans for the expandable rows.
 */
const INTERACTION_COLUMNS: Column[] = [
  { name: 'traceID', displayName: 'Trace ID', minWidth: 130 },
  { name: 'startTime', displayName: 'Start time', unit: START_TIME, minWidth: 100 },
  { name: 'traceDuration', displayName: 'Duration', unit: 'ms', minWidth: 90 },
  { name: 'nested' },
];

/** Transformation that shapes Tempo's trace table into the Interactions columns. */
export const interactionColumns: CustomTransformOperator = () => (source) =>
  source.pipe(map((frames) => pickColumns(frames, INTERACTION_COLUMNS)));

/** Transformation that shapes Tempo's span table into the Model Requests columns. */
export const modelRequestColumns: CustomTransformOperator = () => (source) =>
  source.pipe(map((frames) => pickColumns(frames, MODEL_REQUEST_COLUMNS)));
