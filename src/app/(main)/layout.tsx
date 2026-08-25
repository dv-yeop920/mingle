import { BottomNav } from '@/widgets/bottom-nav';
import { MobileFrame } from '@/widgets/mobile-frame';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MobileFrame>
      <div className="pb-[112px]">{children}</div>
      <BottomNav />
    </MobileFrame>
  );
};

export default MainLayout;
