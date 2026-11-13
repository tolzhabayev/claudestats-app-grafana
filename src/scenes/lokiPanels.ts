import { PanelBuilders, SceneDataProvider, SceneDataTransformer, SceneQueryRunner, VizPanel } from '@grafana/scenes';
import { BarGaugeDisplayMode, BarGaugeValueMode, BigValueGraphMode, VizOrientation } from '@grafana/schema';
import { BAR_GAUGE_COLOR, BAR_GAUGE_TEXT, OVER_TIME_QUERY_OPTIONS } from './panelStyle';
import { LOKI_DS_VARIABLE } from './variables';
import { withEmptyHint } from './HintWhenEmpty';

// Panels over Claude Code events in Loki, shared by the Reliability and Tools tabs.

export const LOKI = { type: 'loki', uid: `\${${LOKI_DS_VARIABLE}}` };

/** Shown instead of "No data" when Loki has no Claude Code events for the period. */
export const NO_EVENTS = 'No events. Needs OTEL_LOGS_EXPORTER=otlp';

export function lokiRunner(refId: string, expr: string, opts: { instant?: boolean; legendFormat?: string } = {}) {
  return new SceneQueryRunner({
    datasource: LOKI,
    ...(opts.instant ? {} : OVER_TIME_QUERY_OPTIONS),
    queries: [
      {
        refId,
        expr,
        queryType: opts.instant ? 'instant' : 'range',
        ...(opts.legendFormat ? { legendFormat: opts.legendFormat } : {}),
      },
    ],
  });
}

/**
 * What an empty Loki panel says. `message` is shown when nothing matched but the
 * tab's event check (every Claude Code event under the same filters) has rows,
 * and the setup hint when it has none, so missing telemetry never reads as a
 * clean result like "No failed logins".
 */
export interface EmptyHint {
  message: string;
  check: SceneQueryRunner;
}

/**
 * The `EmptyHint`s of one tab. They share one event check, which the tab must
 * activate by adding `check` to its `$behaviors`.
 */
export function emptyHints(anyEvents: string) {
  const check = lokiRunner('AnyEvents', anyEvents, { instant: true });
  return Object.assign((message: string): EmptyHint => ({ message, check }), { check });
}

function withEventHints(panel: VizPanel, data: SceneDataProvider, { message, check }: EmptyHint) {
  return withEmptyHint(panel, data, message, { check, message: NO_EVENTS });
}

export function lokiCountStat(
  refId: string,
  expr: string,
  title: string,
  description: string,
  unit = 'none',
  decimals = unit === 'percent' ? 1 : 0
) {
  return PanelBuilders.stat()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setDecimals(decimals)
    .setData(lokiRunner(refId, expr, { instant: true }))
    .setOption('graphMode', BigValueGraphMode.None)
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .setNoValue(NO_EVENTS)
    .build();
}

/**
 * A bar per label value. With `empty`, the panel shows that text instead of an
 * empty bar gauge when nothing matched, such as "No refusals in this period".
 */
export function lokiBreakdown(
  refId: string,
  expr: string,
  label: string,
  title: string,
  description: string,
  unit = 'none',
  empty?: EmptyHint
) {
  const data = lokiRunner(refId, expr, { instant: true });
  const panel = PanelBuilders.bargauge()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setDecimals(unit === 'none' ? 0 : 1)
    // Bars start at 0, so equal counts don't render as empty bars.
    .setMin(0)
    .setOption('displayMode', BarGaugeDisplayMode.Gradient)
    .setColor(BAR_GAUGE_COLOR)
    .setOption('orientation', VizOrientation.Horizontal)
    .setOption('text', BAR_GAUGE_TEXT)
    .setOption('valueMode', BarGaugeValueMode.Text)
    .setOption('showUnfilled', true)
    .setOption('minVizWidth', 150)
    .setOption('minVizHeight', 25)
    // Grafana's Loki data source turns instant metric results into one table
    // (a row per label value, numbers in "Value #<refId>"), so show every row
    // instead of reducing the column to one value, and name each bar by the
    // row's label column.
    .setOption('reduceOptions', { values: true, calcs: [], fields: '' })
    .setDisplayName(`\${__data.fields.${label}}`);
  return empty ? withEventHints(panel.build(), data, empty) : panel.setData(data).build();
}

/** One numeric column of a Loki table: an instant query grouped by the table's label. */
export interface LokiColumn {
  refId: string;
  name: string;
  expr: string;
  unit: string;
  decimals: number;
}

/**
 * A table with one row per value of `label` and one column per query. The Loki
 * data source returns each instant metric query as its own table, so they're
 * merged on the label and renamed.
 */
export function lokiTable(
  title: string,
  description: string,
  label: string,
  labelTitle: string,
  columns: LokiColumn[],
  empty?: EmptyHint
) {
  const data = new SceneDataTransformer({
    $data: new SceneQueryRunner({
      datasource: LOKI,
      queries: columns.map((c) => ({ refId: c.refId, expr: c.expr, queryType: 'instant' })),
    }),
    transformations: [
      { id: 'merge', options: {} },
      {
        id: 'organize',
        options: {
          excludeByName: { Time: true },
          indexByName: Object.fromEntries([[label, 0], ...columns.map((c, i) => [`Value #${c.refId}`, i + 1])]),
          renameByName: Object.fromEntries([[label, labelTitle], ...columns.map((c) => [`Value #${c.refId}`, c.name])]),
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle(title)
    .setDescription(description)
    .setNoValue(NO_EVENTS)
    .setOption('sortBy', [{ displayName: columns[0].name, desc: true }])
    .setOverrides((b) => {
      for (const c of columns) {
        b.matchFieldsWithName(c.name).overrideUnit(c.unit).overrideDecimals(c.decimals);
      }
    });
  return empty ? withEventHints(panel.build(), data, empty) : panel.setData(data).build();
}
