type ResultViewProps = {
  userId: string | null;
  analysisId?: string;
  className?: string;
};

type AtmosphereViewProps = {
  userId: string | null;
  analysisId?: string;
  className?: string;
};

type PairDetailViewProps = {
  userId: string | null;
  analysisId?: string;
  pairIndex?: number;
  className?: string;
};

type PairsViewProps = {
  userId: string | null;
  analysisId?: string;
  className?: string;
};

type RoleDetailViewProps = {
  userId: string | null;
  analysisId?: string;
  roleIndex?: number;
  className?: string;
};

export type {
  AtmosphereViewProps,
  PairDetailViewProps,
  PairsViewProps,
  ResultViewProps,
  RoleDetailViewProps,
};
