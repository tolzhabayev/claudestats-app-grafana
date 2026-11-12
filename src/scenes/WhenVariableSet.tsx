import React from 'react';
import {
  SceneComponentProps,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneVariable,
  sceneGraph,
} from '@grafana/scenes';

interface WhenVariableSetState extends SceneObjectState {
  variableName: string;
  /** Shown once the variable has a value. Its queries run only then. */
  body: SceneObject;
  /** Shown while the variable is empty. */
  placeholder: SceneObject;
}

/**
 * Shows `body` only while a variable has a value, and `placeholder` otherwise.
 * A scene object activates, and its query runner queries, only once it's
 * rendered, so `body` sends no query while the variable is empty. Used for the
 * Traces tab's waterfall: Tempo rejects an empty trace query.
 */
export class WhenVariableSet extends SceneObjectBase<WhenVariableSetState> {
  static Component = WhenVariableSetRenderer;
}

function WhenVariableSetRenderer({ model }: SceneComponentProps<WhenVariableSet>) {
  const { variableName, body, placeholder } = model.useState();
  const variable = sceneGraph.lookupVariable(variableName, model);
  if (!variable) {
    return <placeholder.Component model={placeholder} />;
  }
  return <ByValue variable={variable} body={body} placeholder={placeholder} />;
}

function ByValue({
  variable,
  body,
  placeholder,
}: {
  variable: SceneVariable;
  body: SceneObject;
  placeholder: SceneObject;
}) {
  // Subscribe to the variable so the panel switches as soon as a trace is picked or cleared.
  variable.useState();
  const value = variable.getValue();
  const shown = Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '';
  const child = shown ? body : placeholder;
  return <child.Component model={child} />;
}
