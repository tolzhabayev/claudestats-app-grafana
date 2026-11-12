import type { DataFrame, Field, FieldConfig } from '@grafana/data';
import { pickColumns } from './traceTables';

describe('pickColumns', () => {
  // Built by hand: the repo's jest setup can't load @grafana/data at runtime yet.
  const field = (name: string, type: string, values: unknown[], config: FieldConfig): Field =>
    ({ name, type, values, config }) as unknown as Field;
  const frame: DataFrame = {
    name: 'Spans',
    length: 1,
    fields: [
      field('traceIdHidden', 'string', ['t1'], { custom: { hideFrom: { viz: true } } }),
      field('traceName', 'string', [''], { displayNameFromDS: 'Trace Name' }),
      field('ttft_ms', 'number', [673], { displayNameFromDS: 'ttft_ms' }),
      field('duration', 'number', [6.6e9], { displayNameFromDS: 'Duration', unit: 'ns' }),
    ],
  };

  const [picked] = pickColumns(
    [frame],
    [
      { name: 'ttft_ms', displayName: 'First token', unit: 'ms', minWidth: 95 },
      { name: 'duration', displayName: 'Duration' },
      { name: 'missing', displayName: 'Missing' },
      { name: 'traceIdHidden', displayName: 'Trace ID' },
    ]
  );

  it('keeps only the listed fields that exist, in the listed order', () => {
    expect(picked.fields.map((f) => f.name)).toEqual(['ttft_ms', 'duration', 'traceIdHidden']);
  });

  it('shows a field Tempo hides', () => {
    const traceId = picked.fields[2];
    expect(traceId.config.custom?.hideFrom).toBeUndefined();
    expect(traceId.config.displayName).toBe('Trace ID');
  });

  it('sets the display name, unit and min width, keeping the field unit when none is given', () => {
    expect(picked.fields[0].config).toMatchObject({ displayName: 'First token', unit: 'ms', custom: { minWidth: 95 } });
    expect(picked.fields[1].config.unit).toBe('ns');
  });

  it('gives each field its own empty noValue, so the panel hint stays out of empty cells', () => {
    expect(picked.fields.every((f) => f.config.noValue === '')).toBe(true);
  });

  it('keeps a field without a display name as it is', () => {
    const [kept] = pickColumns([frame], [{ name: 'traceName' }]);
    expect(kept.fields[0]).toBe(frame.fields[1]);
  });
});
