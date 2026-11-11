import React from 'react';
import {
  SceneComponentProps,
  SceneObjectBase,
  SceneObjectState,
  SceneVariable,
  VariableValueControl,
  sceneGraph,
} from '@grafana/scenes';
import { VariableHide } from '@grafana/schema';

interface OptionalVariableControlState extends SceneObjectState {
  variableName: string;
  control?: VariableValueControl;
}

/**
 * A single variable picker that, unlike `VariableValueControl`, disappears while
 * the variable is hidden. Used on pages that list their pickers one by one
 * (Tools, Productivity) for filters that only show when their label has values.
 */
export class OptionalVariableControl extends SceneObjectBase<OptionalVariableControlState> {
  static Component = OptionalVariableControlRenderer;

  constructor(state: OptionalVariableControlState) {
    super({ ...state, control: new VariableValueControl({ variableName: state.variableName }) });
  }
}

function OptionalVariableControlRenderer({ model }: SceneComponentProps<OptionalVariableControl>) {
  const { variableName, control } = model.useState();
  const variable = sceneGraph.lookupVariable(variableName, model);
  if (!variable || !control) {
    return null;
  }
  return <VisibleWhenShown variable={variable} control={control} />;
}

function VisibleWhenShown({ variable, control }: { variable: SceneVariable; control: VariableValueControl }) {
  const { hide } = variable.useState();
  if (hide === VariableHide.hideVariable) {
    return null;
  }
  return <control.Component model={control} />;
}
