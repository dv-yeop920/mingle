type PageSpinnerProps = {
  fullHeight?: boolean;
};

const PageSpinner = ({ fullHeight = false }: PageSpinnerProps) => {
  return (
    <div
      className={`flex items-center justify-center opacity-0 animate-mx-delayed-fade-in ${
        fullHeight ? 'min-h-dvh bg-background' : 'min-h-[60dvh]'
      }`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-disabled border-t-primary" />
    </div>
  );
};

export { PageSpinner, type PageSpinnerProps };
