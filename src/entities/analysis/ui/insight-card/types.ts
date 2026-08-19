type InsightVariant = 'insight' | 'info' | 'positive';

type InsightCardProps = {
  variant: InsightVariant;
  eyebrow: string;
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
};

export type { InsightCardProps, InsightVariant };
