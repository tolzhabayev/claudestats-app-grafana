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
  /** Shown instead of `hint` when the event check is empty too. */
  noEventsHint?: VizPanel;
}

/**
 * Shows a panel, or a plain hint in its place when its query comes back empty.
 * An empty bar gauge draws a grey unfilled track next to its "no value" text,
 * which reads like a broken chart; the hint says what the empty result means.
 * The data lives on this object, so it keeps refreshing while the hint is shown.
 *
 * `eventCheck` is a query for any event under the same filters. It is shared by
 * every panel of a tab, so the tab owns and activates it, and it is kept out of
 * this object's state so it keeps its parent.
 */
export class HintWhenEmpty extends SceneObjectBase<HintWhenEmptyState> {
  static Component = HintWhenEmptyRenderer;

  constructor(
    state: HintWhenEmptyState,
    public readonly eventCheck?: SceneDataProvider
  ) {
    super(state);
  }
}

const isEmpty = (data?: PanelData) =>
  data?.state === LoadingState.Done && data.series.every((frame) => frame.length === 0);

function HintWhenEmptyRenderer({ model }: SceneComponentProps<HintWhenEmpty>) {
  const { panel, hint, noEventsHint } = model.useState();
  const { data } = sceneGraph.getData(model).useState();
  if (!isEmpty(data)) {
    return <panel.Component model={panel} />;
  }
  if (!model.eventCheck || !noEventsHint) {
    return <hint.Component model={hint} />;
  }
  return <EmptyWithEventCheck panel={panel} hint={hint} noEventsHint={noEventsHint} check={model.eventCheck} />;
}

/**
 * The panel came back empty: say why only once the event check has an answer.
 * While it loads, or if it fails, show the panel itself rather than claim that
 * nothing happened or that events are missing.
 */
function EmptyWithEventCheck(props: {
  panel: VizPanel;
  hint: VizPanel;
  noEventsHint: VizPanel;
  check: SceneDataProvider;
}) {
  const { data } = props.check.useState();
  const child = data?.state !== LoadingState.Done ? props.panel : isEmpty(data) ? props.noEventsHint : props.hint;
  return <child.Component model={child} />;
}

/**
 * Wraps `panel` so it shows `message` instead when `data` returns no rows. The
 * panel must not have its own data: it reads `data` from the wrapper.
 *
 * With `noEvents`, its message wins when its event check is empty too, so a
 * panel can say "nothing matched" only when there was something to match.
 */
export function withEmptyHint(
  panel: VizPanel,
  data: SceneDataProvider,
  message: string,
  noEvents?: { check: SceneDataProvider; message: string }
) {
  const { title, description } = panel.state;
  const text = (content: string) =>
    PanelBuilders.text().setTitle(title).setDescription(description).setOption('content', content).build();
  return new HintWhenEmpty(
    {
      $data: data,
      panel,
      hint: text(message),
      ...(noEvents ? { noEventsHint: text(noEvents.message) } : {}),
    },
    noEvents?.check
  );
}
