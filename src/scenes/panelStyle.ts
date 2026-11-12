import { PanelBuilders } from '@grafana/scenes';
import { BarAlignment, GraphDrawStyle, StackingMode, VisibilityMode } from '@grafana/schema';

/**
 * Query options for the "Over Time" panels. Each point is the amount for one
 * `$__interval` (see the Over Time queries in queries.ts). Capping the points
 * keeps bars readable (about 3 hours each over 7 days). The minimum is kept
 * short because Grafana aligns the query end down to a whole step, so the
 * newest partial interval (up to one step) is never shown.
 */
export const OVER_TIME_QUERY_OPTIONS = { maxDataPoints: 60, minInterval: '2m' } as const;

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
