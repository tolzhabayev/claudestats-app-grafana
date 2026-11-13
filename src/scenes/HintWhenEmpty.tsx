import React from 'react';
import { LoadingState, PanelData } from '@grafana/data';
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
  /**
   * A query for any event under the same filters, and the text panel shown
   * instead of `hint` when it is empty too. The query runs as one of this
   * object's behaviors, so it is active while the panel is.
   */
  noEvents?: { data: SceneDataProvider; hint: VizPanel };
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

const isEmpty = (data?: PanelData) =>
  data?.state === LoadingState.Done && data.series.every((frame) => frame.length === 0);

function HintWhenEmptyRenderer({ model }: SceneComponentProps<HintWhenEmpty>) {
  const { panel, hint, noEvents } = model.useState();
  const { data } = sceneGraph.getData(model).useState();
  if (!isEmpty(data)) {
    return <panel.Component model={panel} />;
  }
  if (!noEvents) {
    return <hint.Component model={hint} />;
  }
  return <EmptyWithEventCheck panel={panel} hint={hint} noEvents={noEvents} />;
}

/**
 * The panel came back empty: say why only once the event check has an answer.
 * While it loads, or if it fails, show the panel itself rather than claim that
 * nothing happened or that events are missing.
 */
function EmptyWithEventCheck({ panel, hint, noEvents }: Required<Omit<HintWhenEmptyState, keyof SceneObjectState>>) {
  const { data } = noEvents.data.useState();
  const child = data?.state !== LoadingState.Done ? panel : isEmpty(data) ? noEvents.hint : hint;
  return <child.Component model={child} />;
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
  return new HintWhenEmpty({
    $data: data,
    panel,
    hint: text(message),
    ...(noEvents
      ? { noEvents: { data: noEvents.data, hint: text(noEvents.message) }, $behaviors: [noEvents.data] }
      : {}),
  });
}
