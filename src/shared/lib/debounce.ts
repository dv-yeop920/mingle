type DebouncedFn<Args extends unknown[]> = {
  (...args: Args): void;
  cancel: () => void;
  flush: () => void;
};

const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): DebouncedFn<Args> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Args | null = null;

  const debounced = (...args: Args) => {
    latestArgs = args;
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    latestArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId !== null && latestArgs !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn(...latestArgs);
      latestArgs = null;
    }
  };

  return debounced;
};

export { debounce, type DebouncedFn };
