import { useEffect, useRef, useState } from 'react';

const useDebouncedValue = <T>(value: T, ms: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, ms);

    return () => clearTimeout(timeoutId);
  }, [value, ms]);

  return debouncedValue;
};

export { useDebouncedValue };
