import type { Metric } from '@/entities/analysis';
import { MetricBar } from '@/entities/analysis';

type ResultMetricsSectionProps = {
  metrics: Metric[];
};

const ResultMetricsSection = ({ metrics }: ResultMetricsSectionProps) => (
  <section className="flex flex-col gap-[15px] rounded-card-lg bg-surface p-5 shadow-md">
    <h3 className="text-section font-black text-foreground">케미 지표</h3>
    {metrics.map((metric) => (
      <MetricBar
        key={metric.label}
        label={metric.label}
        value={metric.value}
        isCaution={metric.isCaution}
      />
    ))}
  </section>
);

export { ResultMetricsSection, type ResultMetricsSectionProps };
