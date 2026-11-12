import { PanelBuilders, SceneQueryRunner } from '@grafana/scenes';
import {
  BarAlignment,
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  GraphDrawStyle,
  StackingMode,
  VisibilityMode,
  VizOrientation,
} from '@grafana/schema';
import { withEmptyHint } from './HintWhenEmpty';

/**
 * Query options for the "Over Time" panels. Each point is the amount for one
 * `$__interval` (see the Over Time queries in queries.ts). Capping the points
 * keeps bars readable (about 3 hours each over 7 days). The minimum is kept
 * short because Grafana aligns the query end down to a whole step, so the
 * newest partial interval (up to one step) is never shown.
 */
export const OVER_TIME_QUERY_OPTIONS = { maxDataPoints: 60, minInterval: '2m' } as const;

/**
 * Min step for each "Over Time" query. Grafana derives `$__rate_interval` from a
 * query's Min step when set, else from the data source's scrape interval
 * (15s by default). Claude Code exports once a minute, so with the default the
 * rate window barely overlaps the previous bar and a jump between two exports
 * can fall between windows. With a 1m Min step the window is
 * max(bar + 1m, 4m), which always reaches back past the previous export.
 */
export const OVER_TIME_MIN_STEP = '1m';

/**
 * A time series drawn as stacked bars, one per interval: spend, tokens or
 * events per hour or day. Bursty usage drawn as lines showed up as thin
 * needles.
 */
export function overTimeBars() {
  return PanelBuilders.timeseries()
    .setCustomFieldConfig('drawStyle', GraphDrawStyle.Bars)
    .setCustomFieldConfig('barAlignment', BarAlignment.Before)
    .setCustomFieldConfig('fillOpacity', 80)
    .setCustomFieldConfig('lineWidth', 1)
    .setCustomFieldConfig('showPoints', VisibilityMode.Never)
    .setCustomFieldConfig('stacking', { mode: StackingMode.Normal });
}

/**
 * Bar gauge color: a blue-purple scale by value. The default green-to-red
 * gradient made the biggest bucket look like a problem.
 */
export const BAR_GAUGE_COLOR = { mode: 'continuous-BlPu' } as const;

/**
 * A horizontal bar gauge, one bar per series, labelled with the series name.
 * Bars start at zero: without a min, Grafana scales from the smallest value,
 * so the smallest bar (or a single bar) is drawn empty.
 */
export function horizontalBars() {
  return PanelBuilders.bargauge()
    .setMin(0)
    .setOption('displayMode', BarGaugeDisplayMode.Gradient)
    .setColor(BAR_GAUGE_COLOR)
    .setOption('orientation', VizOrientation.Horizontal)
    .setOption('valueMode', BarGaugeValueMode.Text)
    .setOption('showUnfilled', true)
    .setOption('minVizWidth', 150)
    .setOption('minVizHeight', 25)
    .setDisplayName('${__series.name}');
}

/**
 * A horizontal bar gauge with one bar per attribution bucket, mirroring the
 * "Usage by Tool" gauge on the Tools page. The query is a plain instant
 * multi-series vector (`sort_desc(...)` in PromQL puts the biggest bucket
 * first); `legendFormat` names each series after `labelKey`, and
 * `${__series.name}` surfaces that name as the bar label.
 */
export function attributionBarGauge(
  refId: string,
  expr: string,
  labelKey: string,
  title: string,
  unit: string,
  {
    legendFormat = `{{${labelKey}}}`,
    noValue,
    description,
  }: {
    /** Series name, when it's built from more than `labelKey`. */
    legendFormat?: string;
    /** Shown in place of the bars when nothing matched, to say why or what the panel needs. */
    noValue?: string;
    /** Panel description, shown as an (i) icon next to the title. */
    description?: string;
  } = {}
) {
  const data = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [{ refId, expr, legendFormat, instant: true }],
  });

  const panel = horizontalBars().setTitle(title).setDescription(description).setUnit(unit);
  // With a hint, show it in place of an empty bar gauge (which draws a grey unfilled track).
  return noValue ? withEmptyHint(panel.build(), data, noValue) : panel.setData(data).build();
}
