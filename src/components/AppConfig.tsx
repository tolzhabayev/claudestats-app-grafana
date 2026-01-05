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
  Tab,
  TabsBar,
  TabContent,
  CodeEditor,
  Card,
  VerticalGroup,
  HorizontalGroup,
  ClipboardButton,
  Icon,
  Badge,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { ClaudeStatsSettings } from '../types';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<ClaudeStatsSettings>> {}

interface SetupConfig {
  otlpEndpoint: string;
  otlpToken: string;
}

export function AppConfig({ plugin }: AppConfigProps) {
  const styles = useStyles2(getStyles);
  const { enabled } = plugin.meta;
  const [isEnabled] = useState(enabled);
  const [activeTab, setActiveTab] = useState('setup');
  const [setupConfig, setSetupConfig] = useState<SetupConfig>({
    otlpEndpoint: '',
    otlpToken: '',
  });

  const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta>) => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/settings`, data);
      window.location.reload();
    } catch (e) {
      console.error('Error updating plugin settings:', e);
    }
  };

  const onEnable = () => {
    updatePluginAndReload(plugin.meta.id, {
      enabled: true,
      pinned: true,
      jsonData: {},
    });
  };

  const onDisable = () => {
    updatePluginAndReload(plugin.meta.id, {
      enabled: false,
      pinned: false,
    });
  };

  const generateEnvScript = () => {
    const endpoint = setupConfig.otlpEndpoint || 'https://otlp-gateway-prod-<region>.grafana.net/otlp';
    const token = setupConfig.otlpToken || '<your-base64-encoded-token>';

    return `# Add these to your shell profile (~/.zshrc, ~/.bashrc, or ~/.bash_profile)

# Enable Claude Code telemetry
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# Configure OpenTelemetry metrics exporter (metrics only, no logs)
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"

# Grafana Cloud OTLP endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="${endpoint}"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic ${token}"

# IMPORTANT: Use cumulative temporality for Grafana Cloud compatibility
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative

# Optional: Adjust export interval (in milliseconds, default: 60000)
export OTEL_METRIC_EXPORT_INTERVAL=60000

# After adding these, restart your shell or run:
# source ~/.zshrc  # or source ~/.bashrc`;
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
              Claude Code Stats is active. Visit the <a href="/a/timurdigital-claudestats-app">Overview page</a> to see your team&apos;s usage.
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
              <VerticalGroup spacing="lg">
                <Alert title="Quick Start" severity="info">
                  Configure Claude Code to send telemetry to Grafana Cloud in 4 steps.
                </Alert>

                <Card>
                  <Card.Heading>Step 1: Get Grafana Cloud OTLP Credentials</Card.Heading>
                  <Card.Description>
                    <ol className={styles.numberedList}>
                      <li>Go to your <a href="https://grafana.com/profile/org" target="_blank" rel="noreferrer">Grafana Cloud Portal</a></li>
                      <li>Select your stack and click <strong>Configure</strong> in the OpenTelemetry tile</li>
                      <li>Click <strong>Generate API Token</strong></li>
                      <li>Copy the OTLP endpoint and token</li>
                    </ol>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Step 2: Enter Your Credentials</Card.Heading>
                  <Card.Description>
                    <VerticalGroup spacing="md">
                      <Field label="OTLP Endpoint" description="Your Grafana Cloud OTLP endpoint">
                        <Input
                          placeholder="https://otlp-gateway-prod-us-east-0.grafana.net/otlp"
                          value={setupConfig.otlpEndpoint}
                          onChange={(e) => setSetupConfig({ ...setupConfig, otlpEndpoint: e.currentTarget.value })}
                        />
                      </Field>
                      <Field label="API Token (Base64)" description="Your Grafana Cloud API token">
                        <Input
                          type="password"
                          placeholder="Your base64-encoded token"
                          value={setupConfig.otlpToken}
                          onChange={(e) => setSetupConfig({ ...setupConfig, otlpToken: e.currentTarget.value })}
                        />
                      </Field>
                    </VerticalGroup>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>
                    <HorizontalGroup justify="space-between">
                      <span>Step 3: Add to Shell Profile</span>
                      <ClipboardButton getText={() => generateEnvScript()} icon="copy">
                        Copy Script
                      </ClipboardButton>
                    </HorizontalGroup>
                  </Card.Heading>
                  <Card.Description>
                    <CodeEditor
                      value={generateEnvScript()}
                      language="shell"
                      height={380}
                      readOnly
                      showMiniMap={false}
                      showLineNumbers
                    />
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Step 4: Restart Claude Code</Card.Heading>
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
                      Claude Code exports metrics to <strong>Mimir</strong> (Prometheus-compatible).
                      This app queries the metrics to display your team&apos;s usage analytics.
                      Team members are identified by their <code>user_email</code> label.
                    </p>
                  </Card.Description>
                </Card>

                <Alert title="Next Step" severity="success">
                  Once configured, data should appear within a few minutes. Team members will be identified by their email address automatically.
                </Alert>
              </VerticalGroup>
            )}

            {activeTab === 'troubleshooting' && (
              <VerticalGroup spacing="lg">
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
                      </li>
                      <li>
                        <strong>Use Claude Code for a few minutes:</strong>
                        <p>Metrics are exported periodically (default: every 60 seconds). Have a conversation, edit some code, then wait 1-2 minutes.</p>
                      </li>
                      <li>
                        <strong>Query metrics directly in Grafana Explore:</strong>
                        <CodeEditor
                          value="claude_code_cost_usage_USD_total"
                          language="promql"
                          height={40}
                          readOnly
                          showMiniMap={false}
                        />
                      </li>
                    </ol>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Authentication Errors</Card.Heading>
                  <Card.Description>
                    <ul className={styles.list}>
                      <li>Ensure the token is Base64-encoded correctly</li>
                      <li>Check the token has OTLP write permissions</li>
                      <li>Verify the endpoint matches your Grafana Cloud region</li>
                    </ul>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Data Source Not Found</Card.Heading>
                  <Card.Description>
                    <p>This app requires a Prometheus data source. Grafana Cloud stacks include this by default.</p>
                    <ol className={styles.numberedList}>
                      <li>Go to <strong>Connections → Data sources</strong></li>
                      <li>Your Grafana Cloud Prometheus (Mimir) should be pre-configured</li>
                      <li>If not, add it from the Grafana Cloud connection details</li>
                    </ol>
                  </Card.Description>
                </Card>

                <Card>
                  <Card.Heading>Metrics Reference</Card.Heading>
                  <Card.Description>
                    <p>Claude Code exports these metrics (OTEL adds unit suffixes):</p>
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
              </VerticalGroup>
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
  dataFlowDescription: css`
    color: ${theme.colors.text.secondary};
    margin-top: ${theme.spacing(2)};
  `,
});
