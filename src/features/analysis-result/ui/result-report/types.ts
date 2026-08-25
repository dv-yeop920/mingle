import type {
  GroupAtmosphere,
  MemberRole,
  Metric,
  PairChemistry,
} from '@/entities/analysis';

type ResultReportProps = {
  chemistryScore: number;
  metrics: Metric[];
  atmospheres: GroupAtmosphere[];
  roles: MemberRole[];
  pairs: PairChemistry[];
  onAtmosphereClick?: () => void;
  onPairClick?: (pairIndex: number) => void;
  className?: string;
};

export type { ResultReportProps };
