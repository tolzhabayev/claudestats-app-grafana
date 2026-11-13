import React, { useState } from 'react';
import { PluginConfigPageProps, AppPluginMeta, PluginMeta, GrafanaTheme2 } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import {
  Button,
  FieldSet,
  Alert,
  useStyles2,
  Field,
  Input,
  RadioButtonGroup,
  Tab,
  TabsBar,
  TabContent,
  CodeEditor,
  Card,
  Stack,
  ClipboardButton,
  Icon,
  Badge,
  TagsInput,
  Checkbox,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { ClaudeStatsSettings, MetricFormat } from '../types';
import { isUsableCustomLabel, toLabelName } from '../scenes/dimensions';
import { buildEnvScript, DEFAULT_FEATURES, DESTINATION_FORMAT, Destination, FEATURES } from './setupScript';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<ClaudeStatsSettings>> {}

export function AppConfig({ plugin }: AppConfigProps) {
  const styles = useStyles2(getStyles);
  const { enabled, jsonData } = plugin.meta;
  const [isEnabled] = useState(enabled);
  const [activeTab, setActiveTab] = useState('setup');
  const [metricFormat, setMetricFormat] = useState<MetricFormat>(
    (jsonData as ClaudeStatsSettings)?.metricFormat ?? 'prometheus'
  );
  const savedCustomLabels = (jsonData as ClaudeStatsSettings)?.customLabels ?? [];
  const [customLabels, setCustomLabels] = useState<string[]>(savedCustomLabels);
  const invalidLabels = customLabels.filter((l) => !isUsableCustomLabel(l));
  const customLabelsChanged = customLabels.join('\n') !== savedCustomLabels.join('\n');
  const [destination, setDestination] = useState<Destination>(metricFormat === 'otlp' ? 'cloud' : 'collector');
  const [endpoints, setEndpoints] = useState<Record<Destination, string>>({ cloud: '', collector: '' });
  const setEndpoint = (value: string) => setEndpoints((current) => ({ ...current, [destination]: value }));
  const [otlpToken, setOtlpToken] = useState('');
  const [features, setFeatures] = useState<string[]>(DEFAULT_FEATURES);
  const envScript = buildEnvScript({
    destination,
    endpoint: endpoints[destination],
    token: otlpToken,
    features,
    customLabels: savedCustomLabels.filter(isUsableCustomLabel),
  });
  const toggleFeature = (id: string) =>
    setFeatures((current) => (current.includes(id) ? current.filter((f) => f !== id) : [...current, id]));

  const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta>) => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/settings`, data);
      window.location.reload();
    } catch (e) {
      console.error('Error updating plugin settings:', e);
    }
  };

  const onSaveMetricFormat = (format: MetricFormat) => {
    setMetricFormat(format);
    updatePluginAndReload(plugin.meta.id, {
      enabled: true,
      pinned: true,
      jsonData: { ...((plugin.meta.jsonData as ClaudeStatsSettings) ?? {}), metricFormat: format },
    });
  };

  const onSaveCustomLabels = () => {
    updatePluginAndReload(plugin.meta.id, {
      enabled: true,
      pinned: true,
      jsonData: { ...((plugin.meta.jsonData as ClaudeStatsSettings) ?? {}), customLabels },
    });
  };

  const onEnable = () => {
    updatePluginAndReload(plugin.meta.id, {
      enabled: true,
      pinned: true,
      jsonData: { ...((plugin.meta.jsonData as ClaudeStatsSettings) ?? {}), metricFormat },
    });
  };

  const onDisable = () => {
    updatePluginAndReload(plugin.meta.id, {
      enabled: false,
      pinned: false,
    });
  };

  const tabs = [
    { label: 'Setup Guide', value: 'setup', icon: 'rocket' as const },
    { label: 'Troubleshooting', value: 'troubleshooting', icon: 'bug' as const },
  ];

  return (
    <div className={styles.container}>
      <FieldSet label="Plugin Status">
        {!isEnabled ? (
          <>
            <Alert title="Plugin is not enabled" severity="info">
              Enable the plugin to start tracking Claude Code usage for your team.
            </Alert>
            <div className={styles.buttonRow}>
              <Button variant="primary" onClick={onEnable}>
                Enable Plugin
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert title="Plugin is enabled" severity="success">
              Claude Code Stats is active. Visit the <a href="/a/timurdigital-claudestats-app">Overview page</a> to see
              your team&apos;s usage.
            </Alert>
            <div className={styles.buttonRow}>
              <Button variant="destructive" onClick={onDisable}>
                Disable Plugin
              </Button>
            </div>
          </>
        )}
      </FieldSet>

      {isEnabled && (
        <FieldSet label="Metric Format">
          <Field
            label="Ingestion path"
            description="Choose how Claude Code metrics reach Grafana. This determines the metric naming convention used in queries."
          >
            <RadioButtonGroup
              options={[
                {
                  label: 'Prometheus / OTEL Collector',
                  value: 'prometheus' as MetricFormat,
                  description: 'Via OTEL Collector → Prometheus (adds _total and unit suffixes)',
                },
                {
                  label: 'Direct OTLP',
                  value: 'otlp' as MetricFormat,
                  description: 'Sent directly to Mimir / Grafana Cloud OTLP endpoint',
                },
              ]}
              value={metricFormat}
              onChange={onSaveMetricFormat}
            />
          </Field>
        </FieldSet>
      )}

      {isEnabled && (
        <FieldSet label="Filters">
          <Field
            label="Filter labels"
            description="Extra labels to filter every panel by, such as attributes set with OTEL_RESOURCE_ATTRIBUTES. Enter the attribute name (team.id) or the Prometheus label (team_id); each gets its own picker. The Repository filter is built in."
            invalid={invalidLabels.length > 0}
            error={
              invalidLabels.length > 0
                ? `Not usable as a filter: ${invalidLabels.join(', ')}. Use letters, digits, dots and underscores, and not a label the app already filters by.`
                : undefined
            }
          >
            <TagsInput
              tags={customLabels}
              onChange={setCustomLabels}
              placeholder="team.id, then Enter"
              aria-label="Filter labels"
            />
          </Field>
          {customLabels.some((l) => toLabelName(l) !== l && isUsableCustomLabel(l)) && (
            <Alert title="Label names" severity="info">
              Filters on{' '}
              {customLabels
                .filter((l) => toLabelName(l) !== l && isUsableCustomLabel(l))
                .map((l) => `${l} → ${toLabelName(l)}`)
                .join(', ')}
              , the names these attributes get in Prometheus.
            </Alert>
          )}
          <Button onClick={onSaveCustomLabels} disabled={!customLabelsChanged || invalidLabels.length > 0}>
            Save filters
          </Button>
        </FieldSet>
      )}

      {isEnabled && (
        <>
          <TabsBar>
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                label={tab.label}
                icon={tab.icon}
                active={activeTab === tab.value}
                onChangeTab={() => setActiveTab(tab.value)}
              />
            ))}
          </TabsBar>

          <TabContent className={styles.tabContent}>
            {activeTab === 'setup' && (
              <Stack direction="column" gap={3}>
                <Alert title="Quick Start" severity="info">
                  Pick where Claude Code sends telemetry and the features you want. The script in step 4 follows your
                  choices.
                </Alert>

                <Card>
                  <Card.Heading>Step 1: Choose a Destination</Card.Heading>
                  <Card.Description>
                    <Stack direction="column" gap={2}>
                      <RadioButtonGroup
                        aria-label="Destination"
                        options={[
                          { label: 'Grafana Cloud', value: 'cloud' as Destination },
                          { label: 'OpenTelemetry Collector', value: 'collector' as Destination },
                        ]}
                        value={destination}
                        onChange={setDestination}
                      />
                      {DESTINATION_FORMAT[destination] !== metricFormat && (
                        <Alert title="Ingestion path doesn't match" severity="warning">
                          <Stack direction="column" gap={1} alignItems="flex-start">
                            <span>
                              Metrics sent this way need the{' '}
                              <strong>{destination === 'cloud' ? 'Direct OTLP' : 'Prometheus / OTEL Collector'}</strong>{' '}
                              ingestion path, or every panel shows no data.
                            </span>
                            <Button size="sm" onClick={() => onSaveMetricFormat(DESTINATION_FORMAT[destination])}>
                              Switch ingestion path
                            </Button>
                          </Stack>
                        </Alert>
                      )}
                    </Stack>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>
                    {destination === 'cloud'
                      ? 'Step 2: Get Grafana Cloud OTLP Credentials'
                      : 'Step 2: Collector Endpoint'}
                  </Card.Heading>
                  <Card.Description>
                    {destination === 'cloud' ? (
                      <Stack direction="column" gap={2}>
                        <ol className={styles.numberedList}>
                          <li>
                            Go to your{' '}
                            <a href="https://grafana.com/profile/org" target="_blank" rel="noreferrer">
                              Grafana Cloud Portal
                            </a>
                          </li>
                          <li>
                            Select your stack and click <strong>Configure</strong> in the OpenTelemetry tile
                          </li>
                          <li>
                            Click <strong>Generate API Token</strong>
                          </li>
                          <li>Copy the OTLP endpoint and the generated OTEL_EXPORTER_OTLP_HEADERS value</li>
                        </ol>
                        <Field label="OTLP Endpoint" description="Your Grafana Cloud OTLP endpoint">
                          <Input
                            placeholder="https://otlp-gateway-prod-us-east-0.grafana.net/otlp"
                            value={endpoints[destination]}
                            onChange={(e) => setEndpoint(e.currentTarget.value)}
                          />
                        </Field>
                        <Field
                          label="API Token (Base64)"
                          description="Base64 of instanceID:token: the value after Basic in the OTEL_EXPORTER_OTLP_HEADERS the portal generates"
                        >
                          <Input
                            type="password"
                            placeholder="Base64 of instanceID:token"
                            value={otlpToken}
                            onChange={(e) => setOtlpToken(e.currentTarget.value)}
                          />
                        </Field>
                      </Stack>
                    ) : (
                      <Stack direction="column" gap={2}>
                        <p>
                          The Collector receives OTLP, converts delta temporality to cumulative with the{' '}
                          <code>deltatocumulative</code> processor and exports metrics with{' '}
                          <code>prometheusremotewrite</code>, events to Loki and traces to Tempo.
                        </p>
                        <Field label="Collector Endpoint" description="The Collector's OTLP HTTP endpoint">
                          <Input
                            placeholder="http://<collector-host>:4318"
                            value={endpoints[destination]}
                            onChange={(e) => setEndpoint(e.currentTarget.value)}
                          />
                        </Field>
                      </Stack>
                    )}
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Step 3: Choose Features</Card.Heading>
                  <Card.Description>
                    <p>Metrics are always on. Every tab reads them. Add what else you want to see:</p>
                    <div className={styles.features}>
                      {FEATURES.map((feature) => (
                        <Checkbox
                          key={feature.id}
                          label={feature.label}
                          description={feature.description}
                          value={features.includes(feature.id)}
                          onChange={() => toggleFeature(feature.id)}
                        />
                      ))}
                    </div>
                    {savedCustomLabels.some(isUsableCustomLabel) && (
                      <p className={styles.dataFlowDescription}>
                        The script also sets your filter labels in <code>OTEL_RESOURCE_ATTRIBUTES</code>.
                      </p>
                    )}
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>
                    <Stack justifyContent="space-between" alignItems="center" gap={1}>
                      <span>Step 4: Add to Shell Profile</span>
                      <ClipboardButton getText={() => envScript} icon="copy">
                        Copy Script
                      </ClipboardButton>
                    </Stack>
                  </Card.Heading>
                  <Card.Description>
                    <CodeEditor
                      value={envScript}
                      language="shell"
                      height={envScript.split('\n').length * 18 + 8}
                      readOnly
                      showMiniMap={false}
                      showLineNumbers
                    />
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Step 5: Restart Claude Code</Card.Heading>
                  <Card.Description>
                    <p>After adding the environment variables, restart your terminal and Claude Code:</p>
                    <CodeEditor
                      value={`# Reload your shell config
source ~/.zshrc  # or ~/.bashrc

# Start Claude Code - telemetry will now be enabled
claude`}
                      language="shell"
                      height={100}
                      readOnly
                      showMiniMap={false}
                    />
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Data Flow</Card.Heading>
                  <Card.Description>
                    <div className={styles.dataFlow}>
                      <Badge text="Claude Code" color="blue" />
                      <Icon name="arrow-right" />
                      <Badge text="OTLP" color="purple" />
                      <Icon name="arrow-right" />
                      <Badge text="Grafana Cloud" color="orange" />
                    </div>
                    <p className={styles.dataFlowDescription}>
                      Claude Code exports metrics to <strong>Mimir</strong> (Prometheus-compatible), events to{' '}
                      <strong>Loki</strong> and traces to <strong>Tempo</strong>. Every tab reads the metrics. The
                      Prompts, Workflow, Reliability and Security tabs and the tool performance panels read the events,
                      and the Traces tab reads the traces. Team members are identified by their <code>user_email</code>{' '}
                      label, else <code>enduser_id</code>, else the anonymous <code>user_id</code>.
                    </p>
                  </Card.Description>
                </Card>

                <Alert title="Next Step" severity="success">
                  Once configured, data should appear within a few minutes. Team members will be identified by their
                  email address automatically. For API key, Bedrock, Vertex or Foundry users, set{' '}
                  <code>OTEL_RESOURCE_ATTRIBUTES=enduser.id=&lt;name&gt;</code> to show a readable name.
                </Alert>
              </Stack>
            )}

            {activeTab === 'troubleshooting' && (
              <Stack direction="column" gap={3}>
                <Card>
                  <Card.Heading>No Data Appearing</Card.Heading>
                  <Card.Description>
                    <ol className={styles.numberedList}>
                      <li>
                        <strong>Verify environment variables are set:</strong>
                        <CodeEditor
                          value="env | grep -E '(CLAUDE|OTEL)'"
                          language="shell"
                          height={40}
                          readOnly
                          showMiniMap={false}
                        />
                        <p>
                          <code>OTEL_EXPORTER_OTLP_PROTOCOL</code> has no default: if it isn&apos;t set, Claude Code
                          exports nothing.
                        </p>
                      </li>
                      <li>
                        <strong>Use Claude Code for a few minutes:</strong>
                        <p>
                          Metrics are exported periodically (default: every 60 seconds). Have a conversation, edit some
                          code, then wait 1-2 minutes.
                        </p>
                      </li>
                      <li>
                        <strong>Query metrics directly in Grafana Explore</strong> to confirm data is arriving. Use the
                        name matching your ingestion path:
                        <CodeEditor
                          value={`# Direct OTLP (Grafana Cloud / Mimir)\nclaude_code_cost_usage\n\n# Via OTEL Collector → Prometheus\nclaude_code_cost_usage_USD_total`}
                          language="promql"
                          height={100}
                          readOnly
                          showMiniMap={false}
                        />
                      </li>
                    </ol>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Event or Trace Tabs Empty</Card.Heading>
                  <Card.Description>
                    <ul className={styles.list}>
                      <li>
                        Panels that say <code>Needs OTEL_LOGS_EXPORTER=otlp</code> mean Loki has no Claude Code events
                        for the period. Set <code>OTEL_LOGS_EXPORTER=otlp</code> and restart Claude Code.
                      </li>
                      <li>
                        The Traces tab needs <code>CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1</code> and{' '}
                        <code>OTEL_TRACES_EXPORTER=otlp</code>.
                      </li>
                      <li>
                        Pick the Loki data source in <strong>Events</strong> and the Tempo data source in{' '}
                        <strong>Traces</strong> at the top of the tab.
                      </li>
                    </ul>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Authentication Errors</Card.Heading>
                  <Card.Description>
                    <ul className={styles.list}>
                      <li>
                        Ensure the value after Basic is the Base64 encoding of instanceID:token, not the token alone
                      </li>
                      <li>Check the token has OTLP write permissions</li>
                      <li>Verify the endpoint matches your Grafana Cloud region</li>
                    </ul>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Data Source Not Found</Card.Heading>
                  <Card.Description>
                    <p>
                      This app requires a Prometheus data source, plus Loki for the event tabs and Tempo for the Traces
                      tab. Grafana Cloud stacks include all three by default.
                    </p>
                    <ol className={styles.numberedList}>
                      <li>
                        Go to <strong>Connections → Data sources</strong>
                      </li>
                      <li>
                        Your Grafana Cloud Prometheus (Mimir), Loki and Tempo data sources should be pre-configured
                      </li>
                      <li>If not, add it from the Grafana Cloud connection details</li>
                    </ol>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Metrics Reference</Card.Heading>
                  <Card.Description>
                    <p>
                      Metric names depend on your ingestion path. Set the correct format in the{' '}
                      <strong>Metric Format</strong> selector above.
                    </p>
                    <p>
                      <strong>Direct OTLP (Grafana Cloud / Mimir):</strong>
                    </p>
                    <CodeEditor
                      value={`claude_code_session_count
claude_code_cost_usage
claude_code_token_usage
claude_code_lines_of_code_count
claude_code_commit_count
claude_code_pull_request_count
claude_code_active_time_total
claude_code_code_edit_tool_decision`}
                      language="promql"
                      height={180}
                      readOnly
                      showMiniMap={false}
                    />
                    <p>
                      <strong>Via OTEL Collector → Prometheus:</strong>
                    </p>
                    <CodeEditor
                      value={`claude_code_session_count_total
claude_code_cost_usage_USD_total
claude_code_token_usage_tokens_total
claude_code_lines_of_code_count_total
claude_code_commit_count_total
claude_code_pull_request_count_total
claude_code_active_time_seconds_total
claude_code_code_edit_tool_decision_total`}
                      language="promql"
                      height={180}
                      readOnly
                      showMiniMap={false}
                    />
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Documentation</Card.Heading>
                  <Card.Description>
                    <p>
                      For full telemetry documentation, see:{' '}
                      <a href="https://code.claude.com/docs/en/monitoring-usage" target="_blank" rel="noreferrer">
                        Claude Code Monitoring Usage Guide
                      </a>
                    </p>
                  </Card.Description>
                </Card>
              </Stack>
            )}
          </TabContent>
        </>
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    max-width: 900px;
  `,
  buttonRow: css`
    margin-top: ${theme.spacing(2)};
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
  `,
  tabContent: css`
    padding: ${theme.spacing(3)} 0;
  `,
  list: css`
    margin: ${theme.spacing(1)} 0;
    padding-left: ${theme.spacing(3)};

    li {
      margin-bottom: ${theme.spacing(0.5)};
    }
  `,
  numberedList: css`
    margin: ${theme.spacing(1)} 0;
    padding-left: ${theme.spacing(3)};

    li {
      margin-bottom: ${theme.spacing(1)};
    }
  `,
  dataFlow: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin: ${theme.spacing(2)} 0;
  `,
  features: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1.5)};

    label {
      grid-template-columns: min-content 1fr;
    }
  `,
  dataFlowDescription: css`
    color: ${theme.colors.text.secondary};
    margin-top: ${theme.spacing(2)};
  `,
});
