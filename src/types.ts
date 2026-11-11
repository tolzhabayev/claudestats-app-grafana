/**
 * Metric naming format based on ingestion path:
 * - 'prometheus': Metrics pass through Prometheus/OTEL Collector (adds _total, unit suffixes)
 * - 'otlp': Metrics sent directly via OTLP to Mimir/Grafana Cloud (original names)
 */
export type MetricFormat = 'prometheus' | 'otlp';

/**
 * Plugin JSON data stored in Grafana
 */
export interface ClaudeStatsSettings {
  metricFormat?: MetricFormat;
  /**
   * Extra labels to filter every panel by, as OTel attribute names (`team.id`)
   * or Prometheus label names (`team_id`). Each gets its own picker.
   */
  customLabels?: string[];
}
