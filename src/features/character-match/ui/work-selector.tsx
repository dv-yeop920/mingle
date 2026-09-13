'use client';

import { Chip } from '@/shared/ui';

import { WORKS } from '@/entities/character-match';

type WorkSelectorProps = {
  selectedWorkId: string | null;
  onSelect: (workId: string) => void;
};

const WorkSelector = ({ selectedWorkId, onSelect }: WorkSelectorProps) => (
  <div className="flex flex-wrap gap-[10px]">
    {WORKS.map((work) => (
      <Chip
        key={work.id}
        label={work.name}
        isActive={selectedWorkId === work.id}
        onClick={() => onSelect(work.id)}
      />
    ))}
  </div>
);

export { WorkSelector };
