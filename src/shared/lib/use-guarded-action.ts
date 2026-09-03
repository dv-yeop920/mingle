import { useRef, useState } from 'react';

const useGuardedAction = <Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
): [guardedAction: (...args: Args) => Promise<R | undefined>, isRunning: boolean] => {
  const isRunningRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const guardedAction = async (...args: Args): Promise<R | undefined> => {
    if (isRunningRef.current) return undefined;
    isRunningRef.current = true;
    setIsRunning(true);

    try {
      return await action(...args);
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  };

  return [guardedAction, isRunning];
};

export { useGuardedAction };
