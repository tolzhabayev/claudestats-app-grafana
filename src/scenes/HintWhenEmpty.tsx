import React from 'react';
import { LoadingState } from '@grafana/data';
import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataProvider,
  SceneObjectBase,
  SceneObjectState,
  VizPanel,
  sceneGraph,
} from '@grafana/scenes';

interface HintWhenEmptyState extends SceneObjectState {
  /** The panel to show when the query has rows. It reads its data from this object. */
  panel: VizPanel | HintWhenEmpty;
  /** A text panel with the same title, shown when the query returns no rows. */
  hint: VizPanel;
}

/**
 * Shows a panel, or a plain hint in its place when its query comes back empty.
 * An empty bar gauge draws a grey unfilled track next to its "no value" text,
 * which reads like a broken chart; the hint says what the empty result means.
 * The data lives on this object, so it keeps refreshing while the hint is shown.
 */
export class HintWhenEmpty extends SceneObjectBase<HintWhenEmptyState> {
  static Component = HintWhenEmptyRenderer;
}

function HintWhenEmptyRenderer({ model }: SceneComponentProps<HintWhenEmpty>) {
  const { panel, hint } = model.useState();
  const { data } = sceneGraph.getData(model).useState();
  const empty = data?.state === LoadingState.Done && data.series.every((frame) => frame.length === 0);
  if (empty) {
    return <hint.Component model={hint} />;
  }
  return panel instanceof HintWhenEmpty ? <panel.Component model={panel} /> : <panel.Component model={panel} />;
}

/**
 * Wraps `panel` so it shows `message` instead when `data` returns no rows. The
 * panel must not have its own data: it reads `data` from the wrapper.
 *
 * With `noEvents`, its message wins when its own query is empty too, so a
 * panel can say "nothing matched" only when there was something to match.
 */
export function withEmptyHint(
  panel: VizPanel,
  data: SceneDataProvider,
  message: string,
  noEvents?: { data: SceneDataProvider; message: string }
) {
  const { title, description } = panel.state;
  const text = (content: string) =>
    PanelBuilders.text().setTitle(title).setDescription(description).setOption('content', content).build();
  const hinted = new HintWhenEmpty({ $data: data, panel, hint: text(message) });
  return noEvents ? new HintWhenEmpty({ $data: noEvents.data, panel: hinted, hint: text(noEvents.message) }) : hinted;
}
