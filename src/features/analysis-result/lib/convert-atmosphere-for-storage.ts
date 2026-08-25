import type { Json } from '@/shared/types/database';

type ConvertAtmosphereForStorageParams = {
  groupAtmosphere: Json;
  decisionMaking?: Json;
  cautionPoint?: Json;
  bestMoment?: Json;
};

const isRecord = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const convertAtmosphereForStorage = ({
  groupAtmosphere,
  decisionMaking,
  cautionPoint,
  bestMoment,
}: ConvertAtmosphereForStorageParams): Json => {
  if (!isRecord(groupAtmosphere) || !('title' in groupAtmosphere)) {
    return groupAtmosphere;
  }

  return {
    groupAtmosphere,
    decisionMaking: decisionMaking ?? null,
    cautionPoint: cautionPoint ?? null,
    bestMoment: bestMoment ?? null,
  };
};

export { convertAtmosphereForStorage, type ConvertAtmosphereForStorageParams };
