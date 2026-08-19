type GroupType = 'friends' | 'work' | 'family' | 'custom';

type Group = {
  id: string;
  userId: string;
  type: GroupType;
  customName: string | null;
  createdAt: string;
};

export type { Group, GroupType };
