import { PanelBuilders, SceneQueryRunner } from '@grafana/scenes';
import { BarGaugeDisplayMode, BarGaugeValueMode, BigValueGraphMode, VizOrientation } from '@grafana/schema';
import { BAR_GAUGE_COLOR, OVER_TIME_QUERY_OPTIONS } from './panelStyle';
import { LOKI_DS_VARIABLE } from './variables';

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

export function lokiCountStat(refId: string, expr: string, title: string, description: string, unit = 'none') {
  return PanelBuilders.stat()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setDecimals(unit === 'percent' ? 1 : 0)
    .setData(lokiRunner(refId, expr, { instant: true }))
    .setOption('graphMode', BigValueGraphMode.None)
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .setNoValue(NO_EVENTS)
    .build();
}

export function lokiBreakdown(
  refId: string,
  expr: string,
  label: string,
  title: string,
  description: string,
  unit = 'none'
) {
  return (
    PanelBuilders.bargauge()
      .setTitle(title)
      .setDescription(description)
      .setUnit(unit)
      .setDecimals(unit === 'none' ? 0 : 1)
      // Bars start at 0, so equal counts don't render as empty bars.
      .setMin(0)
      .setData(lokiRunner(refId, expr, { instant: true }))
      .setOption('displayMode', BarGaugeDisplayMode.Gradient)
      .setColor(BAR_GAUGE_COLOR)
      .setOption('orientation', VizOrientation.Horizontal)
      .setOption('valueMode', BarGaugeValueMode.Text)
      .setOption('showUnfilled', true)
      .setOption('minVizWidth', 150)
      .setOption('minVizHeight', 25)
      // Grafana's Loki data source turns instant metric results into one table
      // (a row per label value, numbers in "Value #<refId>"), so show every row
      // instead of reducing the column to one value, and name each bar by the
      // row's label column.
      .setOption('reduceOptions', { values: true, calcs: [], fields: '' })
      .setDisplayName(`\${__data.fields.${label}}`)
      .build()
  );
}
