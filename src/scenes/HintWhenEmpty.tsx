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
  panel: VizPanel;
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
  const child = empty ? hint : panel;
  return <child.Component model={child} />;
}

/**
 * Wraps `panel` so it shows `message` instead when `data` returns no rows. The
 * panel must not have its own data: it reads `data` from the wrapper.
 */
export function withEmptyHint(panel: VizPanel, data: SceneDataProvider, message: string) {
  const { title, description } = panel.state;
  return new HintWhenEmpty({
    $data: data,
    panel,
    hint: PanelBuilders.text().setTitle(title).setDescription(description).setOption('content', message).build(),
  });
}
