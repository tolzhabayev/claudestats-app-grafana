import { LoadingState, PanelData } from '@grafana/data';
import { SceneDataProvider, SceneFlexLayout, SceneObject } from '@grafana/scenes';

// Layout behaviors that follow a query's result. Both listen to a data provider
// that stays active on its own: a hidden row's panels are unmounted and stop
// querying, so a row can't decide from its own panels when to come back.

const isDone = (data?: PanelData): data is PanelData => data?.state === LoadingState.Done;

/**
 * Hides `row` while `check` returns no rows, and shows it again when it does.
 * `check` must be active while the row is hidden, for example in the scene's
 * `$behaviors` ahead of this behavior.
 */
export function hideWhileEmpty(row: SceneFlexLayout, check: SceneDataProvider) {
  return () => {
    const sub = check.subscribeToState(({ data }) => {
      if (isDone(data)) {
        row.setState({ isHidden: data.series.every((frame) => frame.length === 0) });
      }
    });
    return () => sub.unsubscribe();
  };
}

// A table panel's title bar and padding, and one header or body row, in pixels.
const TABLE_CHROME = 56;
const TABLE_ROW = 36;

/**
 * Sizes the row it's attached to by the rows of the table that `table` feeds, up to `max` pixels,
 * so a table with one or two rows doesn't sit in a mostly empty panel. A longer
 * table keeps `max` and scrolls.
 */
export function fitHeightToRows(table: SceneDataProvider, max: number) {
  return (row: SceneObject) => {
    if (!(row instanceof SceneFlexLayout)) {
      return;
    }
    const sub = table.subscribeToState(({ data }) => {
      if (isDone(data)) {
        // At least room for the header and "No data".
        const rows = Math.max(data.series[0]?.length ?? 0, 2);
        row.setState({ height: Math.min(max, TABLE_CHROME + TABLE_ROW * (rows + 1)) });
      }
    });
    return () => sub.unsubscribe();
  };
}
