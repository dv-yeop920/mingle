import { NextResponse } from 'next/server';

type GroupMember = {
  name: string;
  score: number;
};

type Group = {
  id: string;
  title: string;
  members: GroupMember[];
};

const fetchGroups = (): Group[] => [
  { id: 'g1', title: 'Weekend Crew', members: [{ name: 'Alex', score: 85 }] },
  { id: 'g2', title: 'Study Group', members: [] },
];

export const GET = async () => {
  const groups = fetchGroups();

  const summaries = groups.map((group) => {
    const topMember = group.members[0]!;
    return {
      groupId: group.id,
      title: group.title,
      topMemberName: topMember.name,
      topScore: topMember.score,
    };
  });

  return NextResponse.json({ summaries });
};

export const dynamic = 'force-dynamic';
