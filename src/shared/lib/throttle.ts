type ThrottledFn<Args extends unknown[]> = {
  (...args: Args): void;
  cancel: () => void;
};

const throttle = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): ThrottledFn<Args> => {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Args | null = null;

  const throttled = (...args: Args) => {
    const now = Date.now();
    const elapsed = now - lastCallTime;

    if (elapsed >= ms) {
      lastCallTime = now;
      fn(...args);
    } else {
      latestArgs = args;
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          lastCallTime = Date.now();
          if (latestArgs !== null) {
            fn(...latestArgs);
            latestArgs = null;
          }
        }, ms - elapsed);
      }
    }
  };

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    latestArgs = null;
  };

  return throttled;
};

export { throttle, type ThrottledFn };
