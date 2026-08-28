type RecentTestsProps = {
  analyses: Array<{
    id: string;
    title: string;
    chemistry_score: number;
    created_at: string;
    groups: {
      type: string;
      custom_name: string | null;
      members: { nickname: string; mbti: string; is_self: boolean }[];
    } | null;
  }>;
  className?: string;
};

export type { RecentTestsProps };
