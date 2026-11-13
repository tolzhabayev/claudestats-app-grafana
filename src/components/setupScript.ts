import { MetricFormat } from '../types';

export type Destination = 'cloud' | 'collector';

export const DESTINATION_FORMAT: Record<Destination, MetricFormat> = {
  cloud: 'otlp',
  collector: 'prometheus',
};

export interface TelemetryFeature {
  id: string;
  label: string;
  description: string;
  env: Record<string, string>;
  defaultOn: boolean;
}

export const FEATURES: TelemetryFeature[] = [
  {
    id: 'events',
    label: 'Events',
    description: 'Prompts, Workflow, Reliability and Security tabs, and tool performance on Tools. Needs Loki.',
    env: { OTEL_LOGS_EXPORTER: 'otlp' },
    defaultOn: true,
  },
  {
    id: 'traces',
    label: 'Traces (beta)',
    description: 'The Traces tab, linking each prompt to its model requests and tool calls. Needs Tempo.',
    env: { CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: '1', OTEL_TRACES_EXPORTER: 'otlp' },
    defaultOn: false,
  },
  {
    id: 'repository',
    label: 'Repository',
    description: 'The Repository filter and the cost and tokens by repository panels. Claude Code v2.1.269 or later.',
    env: { OTEL_METRICS_INCLUDE_REPOSITORY: 'true' },
    defaultOn: true,
  },
  {
    id: 'entrypoint',
    label: 'Surface',
    description: 'The Surface panel on Overview: CLI, IDE, desktop or SDK.',
    env: { OTEL_METRICS_INCLUDE_ENTRYPOINT: 'true' },
    defaultOn: true,
  },
  {
    id: 'toolDetails',
    label: 'Tool names',
    description:
      'Real names for custom subagents, skills, plugins and MCP servers instead of custom or third-party. Tool events then include tool details.',
    env: { OTEL_LOG_TOOL_DETAILS: '1' },
    defaultOn: false,
  },
  {
    id: 'enduser',
    label: 'Readable names',
    description: 'A name for team members who use an API key, Bedrock, Vertex or Foundry, set per team member.',
    env: {},
    defaultOn: false,
  },
];

export const DEFAULT_FEATURES = FEATURES.filter((f) => f.defaultOn).map((f) => f.id);

export interface ScriptOptions {
  destination: Destination;
  endpoint: string;
  token: string;
  features: string[];
  customLabels: string[];
}

const exportLine = (name: string, value: string) => `export ${name}="${value}"`;

export function buildEnvScript({ destination, endpoint, token, features, customLabels }: ScriptOptions): string {
  const on = new Set(features);
  const lines = [
    '# Add these to your shell profile (~/.zshrc, ~/.bashrc, or ~/.bash_profile)',
    '',
    '# Metrics, used by every tab',
    exportLine('CLAUDE_CODE_ENABLE_TELEMETRY', '1'),
    exportLine('OTEL_METRICS_EXPORTER', 'otlp'),
    exportLine('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
  ];

  if (destination === 'cloud') {
    lines.push(
      exportLine('OTEL_EXPORTER_OTLP_ENDPOINT', endpoint || 'https://otlp-gateway-prod-<region>.grafana.net/otlp'),
      exportLine('OTEL_EXPORTER_OTLP_HEADERS', `Authorization=Basic ${token || '<base64-of-instance-id:token>'}`),
      '# Grafana Cloud (Mimir) needs cumulative temporality',
      exportLine('OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE', 'cumulative')
    );
  } else {
    lines.push(exportLine('OTEL_EXPORTER_OTLP_ENDPOINT', endpoint || 'http://<collector-host>:4318'));
  }

  for (const feature of FEATURES) {
    const vars = Object.entries(feature.env);
    if (on.has(feature.id) && vars.length > 0) {
      lines.push('', `# ${feature.label}`, ...vars.map(([name, value]) => exportLine(name, value)));
    }
  }

  const attributes = [
    ...(on.has('enduser') ? ['enduser.id=<name>'] : []),
    ...customLabels.map((label) => `${label}=<${label}>`),
  ];
  if (attributes.length > 0) {
    lines.push(
      '',
      '# Attributes for each team member: replace the <...> values',
      exportLine('OTEL_RESOURCE_ATTRIBUTES', attributes.join(','))
    );
  }

  lines.push('', '# After adding these, restart your shell or run:', '# source ~/.zshrc  # or source ~/.bashrc');
  return lines.join('\n');
}
