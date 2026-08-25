import type { InsightVariant } from '@/entities/analysis';

type AtmosphereDetailSection = {
  key: string;
  eyebrow: string;
  variant: InsightVariant;
  title: string;
  description: string;
};

type AtmosphereDetailProps = {
  sections: AtmosphereDetailSection[];
  className?: string;
};

export type { AtmosphereDetailProps, AtmosphereDetailSection };
