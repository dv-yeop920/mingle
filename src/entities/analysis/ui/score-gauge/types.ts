type ScoreGaugeSize = 'lg' | 'sm';

type ScoreGaugeProps = {
  score: number;
  size?: ScoreGaugeSize;
  className?: string;
};

export type { ScoreGaugeProps, ScoreGaugeSize };
