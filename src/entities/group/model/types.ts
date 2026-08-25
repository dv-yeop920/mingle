type GroupType = 'friends' | 'company' | 'family';

type Group = {
  id: string;
  userId: string;
  type: GroupType;
  createdAt: string;
};

export type { Group, GroupType };
