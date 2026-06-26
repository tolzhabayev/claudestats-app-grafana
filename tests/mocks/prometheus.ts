import type { Page, Route } from '@playwright/test';

/**
 * Synthetic Prometheus data used to drive the e2e tests.
 *
 * The plugin never talks to Prometheus directly - every panel issues a
 * `POST /api/ds/query` through the Grafana datasource proxy, and the template
 * variables resolve their options through the datasource `resources` endpoint
 * (`label_values(...)`). We intercept both at the network layer and return
 * deterministic dataframes, so tests can assert on concrete rendered values
 * without needing real metrics in Prometheus.
 */

// ==================== Shared label dimensions ====================
// Exported so specs can assert on the exact strings the panels should render.

export const MODELS = ['claude-sonnet-4-5', 'claude-opus-4-1'] as const;
export const MEMBERS = ['timur@example.com', 'alex@example.com'] as const;
export const TOKEN_TYPES = ['input', 'output', 'cache_read', 'cache_creation'] as const;
export const LOC_TYPES = ['added', 'removed'] as const;
export const DECISIONS = ['accept', 'reject'] as const;
export const TOOLS = ['Edit', 'Write', 'Bash'] as const;
export const OS_TYPES = ['darwin', 'linux'] as const;
export const HOST_ARCHES = ['arm64', 'x64'] as const;
export const TERMINAL_TYPES = ['iTerm.app', 'vscode'] as const;
export const SERVICE_VERSIONS = ['1.0.0', '1.1.0'] as const;

// Scalar values rendered by stat panels. Kept under 1000 (or SI-clean) so the
// rendered text contains these digits regardless of Grafana's unit formatting.
export const SCALARS = {
  TotalCost: 487.25,
  TotalTokens: 842,
  TotalSessions: 7,
  ActiveUsers: 3,
  InputTokens: 420,
  OutputTokens: 330,
  CacheReadTokens: 92,
  ToolAcceptanceRate: 75,
  TotalLinesOfCode: 640,
  TotalCommits: 12,
  TotalPullRequests: 4,
  TotalActiveTime: 42,
} as const;

// ==================== Dataframe builders ====================

type FieldType = 'time' | 'number' | 'string';

interface FieldSpec {
  name: string;
  type: FieldType;
  labels?: Record<string, string>;
  values: Array<number | string>;
}

const TYPE_INFO: Record<FieldType, { frame: string }> = {
  time: { frame: 'time.Time' },
  number: { frame: 'float64' },
  string: { frame: 'string' },
};

function makeFrame(refId: string, fields: FieldSpec[], meta?: Record<string, unknown>) {
  return {
    schema: {
      refId,
      ...(meta ? { meta } : {}),
      fields: fields.map((f) => ({
        name: f.name,
        type: f.type,
        typeInfo: TYPE_INFO[f.type],
        ...(f.labels ? { labels: f.labels } : {}),
      })),
    },
    data: { values: fields.map((f) => f.values) },
  };
}

/** Evenly spaced timestamps across the requested range, used for range queries. */
function timeAxis(from: number, to: number, points = 7): number[] {
  const step = (to - from) / (points - 1);
  return Array.from({ length: points }, (_, i) => Math.round(from + step * i));
}

// A single instant value (stat panels).
function scalarFrame(refId: string, value: number) {
  return [
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [0] },
      { name: 'Value', type: 'number', values: [value] },
    ]),
  ];
}

// One instant value per label (pie charts / bar gauges using `instant: true`).
function instantSeriesFrames(refId: string, labelKey: string, series: ReadonlyArray<{ label: string; value: number }>) {
  return series.map(({ label, value }) =>
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [0] },
      { name: 'Value', type: 'number', labels: { [labelKey]: label }, values: [value] },
    ])
  );
}

// One time series per label (timeseries panels).
function rangeSeriesFrames(
  refId: string,
  labelKey: string | null,
  series: ReadonlyArray<{ label?: string; base: number }>,
  range: { from: number; to: number }
) {
  const times = timeAxis(range.from, range.to);
  return series.map(({ label, base }, idx) =>
    makeFrame(
      refId,
      [
        { name: 'Time', type: 'time', values: times },
        {
          name: 'Value',
          type: 'number',
          ...(labelKey && label ? { labels: { [labelKey]: label } } : {}),
          // A gently rising curve so the panel has a visible, non-flat series.
          values: times.map((_, i) => base + idx * 3 + i),
        },
      ],
      { type: 'timeseries-multi', typeVersion: [0, 1] }
    )
  );
}

// Prometheus "table" format: the frontend transform expands the Value field's
// `labels` into columns, so each row must be its own single-value frame with
// the labels attached (NOT separate string columns).
function tableFrame(
  refId: string,
  range: { from: number; to: number },
  rows: ReadonlyArray<{ user_email: string; model: string; value: number }>
) {
  return rows.map((row) =>
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [range.to] },
      {
        name: 'Value',
        type: 'number',
        labels: { user_email: row.user_email, model: row.model },
        values: [row.value],
      },
    ])
  );
}

// ==================== refId -> frames ====================

type FrameBuilder = (refId: string, range: { from: number; to: number }) => object[];

const seriesFromList = (labels: ReadonlyArray<string>, start: number, step: number) =>
  labels.map((label, i) => ({ label, value: start - i * step }));

const DATASET: Record<string, FrameBuilder> = {
  // --- scalars (stat panels) ---
  ...Object.fromEntries(
    Object.entries(SCALARS).map(([refId, value]) => [refId, (id: string) => scalarFrame(id, value)])
  ),

  // --- cost ---
  CostByModel: (id) => instantSeriesFrames(id, 'model', seriesFromList(MODELS, 300, 120)),
  CostByMember: (id) => instantSeriesFrames(id, 'user_email', seriesFromList(MEMBERS, 300, 120)),
  CostOverTime: (id, r) =>
    rangeSeriesFrames(
      id,
      'model',
      MODELS.map((label) => ({ label, base: 5 })),
      r
    ),
  CostOverTimeByMember: (id, r) =>
    rangeSeriesFrames(
      id,
      'user_email',
      MEMBERS.map((label) => ({ label, base: 5 })),
      r
    ),
  CostTable: (id, r) =>
    tableFrame(id, r, [
      { user_email: MEMBERS[0], model: MODELS[0], value: 300.5 },
      { user_email: MEMBERS[1], model: MODELS[1], value: 186.75 },
    ]),

  // --- tokens ---
  TokensByType: (id) => instantSeriesFrames(id, 'type', seriesFromList(TOKEN_TYPES, 400, 90)),
  TokensByModel: (id) => instantSeriesFrames(id, 'model', seriesFromList(MODELS, 500, 150)),
  TokensByMember: (id) => instantSeriesFrames(id, 'user_email', seriesFromList(MEMBERS, 500, 150)),
  TokensOverTime: (id, r) =>
    rangeSeriesFrames(
      id,
      'type',
      TOKEN_TYPES.map((label) => ({ label, base: 20 })),
      r
    ),

  // --- sessions / activity (overview) ---
  ActiveTimeOverTime: (id, r) => rangeSeriesFrames(id, null, [{ base: 30 }], r),

  // --- environment (overview) ---
  UsageByOsType: (id) => instantSeriesFrames(id, 'os_type', seriesFromList(OS_TYPES, 200, 80)),
  UsageByHostArch: (id) => instantSeriesFrames(id, 'host_arch', seriesFromList(HOST_ARCHES, 200, 80)),
  UsageByTerminalType: (id) => instantSeriesFrames(id, 'terminal_type', seriesFromList(TERMINAL_TYPES, 200, 80)),
  UsageByServiceVersion: (id) => instantSeriesFrames(id, 'service_version', seriesFromList(SERVICE_VERSIONS, 200, 80)),

  // --- tools ---
  ToolDecisions: (id) => instantSeriesFrames(id, 'decision', seriesFromList(DECISIONS, 90, 60)),
  ToolDecisionsByTool: (id) => instantSeriesFrames(id, 'tool_name', seriesFromList(TOOLS, 50, 15)),
  ToolDecisionsOverTime: (id, r) =>
    rangeSeriesFrames(
      id,
      'decision',
      DECISIONS.map((label) => ({ label, base: 4 })),
      r
    ),

  // --- productivity ---
  LinesOfCodeByType: (id) => instantSeriesFrames(id, 'type', seriesFromList(LOC_TYPES, 400, 160)),
  LinesOfCodeOverTime: (id, r) =>
    rangeSeriesFrames(
      id,
      'type',
      LOC_TYPES.map((label) => ({ label, base: 15 })),
      r
    ),
  CommitsOverTime: (id, r) => rangeSeriesFrames(id, null, [{ base: 2 }], r),
  PullRequestsOverTime: (id, r) => rangeSeriesFrames(id, null, [{ base: 1 }], r),
  ActiveTimeByMember: (id) => instantSeriesFrames(id, 'user_email', seriesFromList(MEMBERS, 120, 50)),
};

// ==================== Route handlers ====================

interface DsQueryBody {
  queries?: Array<{ refId: string }>;
  from?: string;
  to?: string;
}

function buildQueryResponse(body: DsQueryBody) {
  const from = Number(body.from) || 0;
  const to = Number(body.to) || from + 3 * 60 * 60 * 1000;
  const results: Record<string, { status: number; frames: object[] }> = {};

  for (const query of body.queries ?? []) {
    const builder = DATASET[query.refId];
    results[query.refId] = {
      status: 200,
      // Unknown refIds resolve to a NaN scalar frame so missing fixtures are obvious
      // while still returning a valid query response (avoids panel errors).
      frames: builder ? builder(query.refId, { from, to }) : scalarFrame(query.refId, NaN),
    };
  }

  return { results };
}

function labelValuesResponse(url: string): string[] {
  if (url.includes('/label/user_email/values')) {
    return [...MEMBERS];
  }
  if (url.includes('/label/model/values')) {
    return [...MODELS];
  }
  return [];
}

/**
 * Registers Playwright routes that mock all datasource traffic for the plugin.
 * Must be called before navigating to the app so the initial queries are caught.
 */
export async function mockClaudeData(page: Page): Promise<void> {
  // Panel data.
  await page.route('**/api/ds/query*', async (route: Route) => {
    const body = (route.request().postDataJSON() ?? {}) as DsQueryBody;
    await route.fulfill({ json: buildQueryResponse(body) });
  });

  // Template variable options (label_values) and any other resource calls.
  await page.route('**/api/datasources/**/resources/**', async (route: Route) => {
    const url = route.request().url();

    if (url.includes('/label/') && url.includes('/values')) {
      await route.fulfill({ json: { status: 'success', data: labelValuesResponse(url) } });
      return;
    }

    if (url.includes('/series')) {
      await route.fulfill({
        json: {
          status: 'success',
          data: MEMBERS.flatMap((user_email) =>
            MODELS.map((model) => ({ __name__: 'claude_code_cost_usage_USD_total', user_email, model }))
          ),
        },
      });
      return;
    }

    await route.fulfill({ json: { status: 'success', data: [] } });
  });
}
