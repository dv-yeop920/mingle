import type { Metadata } from 'next';

import { CharacterMatchView } from '@/views/character-match';

export const metadata: Metadata = {
  title: '캐릭터 매칭',
  robots: { index: false, follow: false },
};

const CharacterMatchPage = () => {
  return <CharacterMatchView />;
};

export default CharacterMatchPage;
