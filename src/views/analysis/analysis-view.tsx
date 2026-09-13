import { AnalysisContent } from './analysis-content';

type AnalysisViewProps = {
  className?: string;
};

const AnalysisView = ({ className }: AnalysisViewProps) => {
  return (
    <div className={className}>
      <header className="px-5 pt-[20px]">
        <h1 className="text-[22px] font-black text-foreground">분석</h1>
      </header>
      <AnalysisContent />
    </div>
  );
};

export { AnalysisView, type AnalysisViewProps };
