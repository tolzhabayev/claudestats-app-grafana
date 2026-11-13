import { buildEnvScript, DEFAULT_FEATURES } from './setupScript';

const exported = (script: string) =>
  Object.fromEntries(
    script
      .split('\n')
      .filter((line) => line.startsWith('export '))
      .map((line) => {
        const [name, value] = line.slice('export '.length).split(/=(.*)/s);
        return [name, JSON.parse(value)];
      })
  );

const base = { endpoint: '', token: '', features: [] as string[], customLabels: [] as string[] };

describe('buildEnvScript', () => {
  it('sends metrics to Grafana Cloud with cumulative temporality and the given credentials', () => {
    const env = exported(
      buildEnvScript({ ...base, destination: 'cloud', endpoint: 'https://otlp.example/otlp', token: 'abc=' })
    );
    expect(env).toEqual({
      CLAUDE_CODE_ENABLE_TELEMETRY: '1',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp.example/otlp',
      OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Basic abc=',
      OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: 'cumulative',
    });
  });

  it('sends to a Collector without auth headers or temporality', () => {
    const env = exported(buildEnvScript({ ...base, destination: 'collector' }));
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://<collector-host>:4318');
    expect(env).not.toHaveProperty('OTEL_EXPORTER_OTLP_HEADERS');
    expect(env).not.toHaveProperty('OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE');
  });

  it('adds the settings for each picked feature and nothing for the others', () => {
    const env = exported(
      buildEnvScript({ ...base, destination: 'cloud', features: ['events', 'traces', 'toolDetails'] })
    );
    expect(env).toMatchObject({
      OTEL_LOGS_EXPORTER: 'otlp',
      CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: '1',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_LOG_TOOL_DETAILS: '1',
    });
    expect(env).not.toHaveProperty('OTEL_METRICS_INCLUDE_REPOSITORY');
    expect(env).not.toHaveProperty('OTEL_METRICS_INCLUDE_ENTRYPOINT');
    expect(env).not.toHaveProperty('OTEL_RESOURCE_ATTRIBUTES');
  });

  it('turns on events, repository and surface by default', () => {
    const env = exported(buildEnvScript({ ...base, destination: 'cloud', features: DEFAULT_FEATURES }));
    expect(env).toMatchObject({
      OTEL_LOGS_EXPORTER: 'otlp',
      OTEL_METRICS_INCLUDE_REPOSITORY: 'true',
      OTEL_METRICS_INCLUDE_ENTRYPOINT: 'true',
    });
    expect(env).not.toHaveProperty('OTEL_TRACES_EXPORTER');
    expect(env).not.toHaveProperty('OTEL_LOG_TOOL_DETAILS');
  });

  it('puts the readable name and the filter labels in one resource attributes list', () => {
    const env = exported(
      buildEnvScript({ ...base, destination: 'cloud', features: ['enduser'], customLabels: ['team.id', 'cost_center'] })
    );
    expect(env.OTEL_RESOURCE_ATTRIBUTES).toBe('enduser.id=<name>,team.id=<team.id>,cost_center=<cost_center>');
  });
});
