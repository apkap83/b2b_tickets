import { useState, useEffect } from 'react';

export const useCountdown = (initialTime: number, onExpire: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, onExpire]);

  const start = () => setIsRunning(true);
  const stopTimer = () => setIsRunning(false);

  const resetTimer = (newTime: number) => {
    setTimeLeft(newTime);
    setIsRunning(false);
  };

  return { timeLeft, isRunning, start, stopTimer, resetTimer };
};
