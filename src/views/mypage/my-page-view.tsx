import { MyPageContent } from './my-page-content';

const MyPageView = () => {
  return (
    <div className="flex flex-col">
      <div className="px-6 pt-[10px] pb-[20px]">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          My
        </h1>
      </div>
      <MyPageContent />
    </div>
  );
};

export { MyPageView };
