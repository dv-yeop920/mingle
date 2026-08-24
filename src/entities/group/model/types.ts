type GroupType = 'friends' | 'work' | 'family';

type Group = {
  id: string;
  userId: string;
  type: GroupType;
  createdAt: string;
};

export type { Group, GroupType };
