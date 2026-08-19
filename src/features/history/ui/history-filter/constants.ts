type FilterOption = {
  label: string;
  value: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  { label: '전체', value: 'all' },
  { label: '친구', value: 'friends' },
  { label: '회사·팀', value: 'work' },
  { label: '가족', value: 'family' },
];

export { FILTER_OPTIONS };
