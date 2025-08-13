// lib/hooks.ts
import { useState, useEffect, useRef } from 'react';

// useDebounce hook: Delays updating a value until a specified time has passed without change.
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (resetting the delay)
    // Also cleans up on component unmount or if delay changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Effect runs only when value or delay changes

  return debouncedValue;
}

// useTimer hook: Simple countdown timer.
export function useTimer(initialSeconds: number, onTimerEnd?: () => void): [number, () => void, boolean] {
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [isActive, setIsActive] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

    // Function to clear existing interval
    const clearTimerInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        if (isActive && secondsLeft > 0) {
            // Start interval if active and time remaining
            intervalRef.current = setInterval(() => {
                setSecondsLeft(prev => prev - 1);
            }, 1000);
        } else if (isActive && secondsLeft <= 0) {
            // Timer ended
            setIsActive(false);
            clearTimerInterval(); // Clear interval
            onTimerEnd?.(); // Call callback if provided
        }

        // Cleanup function to clear interval on unmount or when dependencies change
        return () => clearTimerInterval();

    }, [secondsLeft, isActive, onTimerEnd]);

    const startTimer = () => {
        clearTimerInterval(); // Clear any existing timer first
        setSecondsLeft(initialSeconds);
        setIsActive(true);
    };

    // Return current seconds, function to start the timer, and active status
    return [secondsLeft, startTimer, isActive];
}

// Example useOutsideClick hook: Detects clicks outside a specified element.
export function useOutsideClick(ref: React.RefObject<HTMLElement> | any, handler: (event: MouseEvent) => void): void {
    useEffect(() => {
        const listener = (event: MouseEvent) => {
            // Do nothing if clicking ref's element or descendent elements
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener as any); // Handle touch events too

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener as any);
        };
    }, [ref, handler]); // Re-run if ref or handler changes
}

// You can add other custom hooks here, e.g., useWindowSize, useLocalStorage etc.
