import { useState, useEffect, useRef } from 'react';

/**
 * useCountdown — real-time countdown hook
 * Updates every second. Returns:
 *   timeLeft    : { days, hours, minutes, seconds, total_ms }
 *   isExpired   : boolean
 *   formatted   : "2d 3h 10m 5s" string
 */
export function useCountdown(expiresAt) {
  const calcTimeLeft = () => {
    const diff = new Date(expiresAt) - new Date();
    if (!expiresAt || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total_ms: 0, isExpired: true };
    }
    return {
      days:     Math.floor(diff / 86400000),
      hours:    Math.floor((diff % 86400000) / 3600000),
      minutes:  Math.floor((diff % 3600000) / 60000),
      seconds:  Math.floor((diff % 60000) / 1000),
      total_ms: diff,
      isExpired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;

    // Update immediately
    setTimeLeft(calcTimeLeft());

    intervalRef.current = setInterval(() => {
      const t = calcTimeLeft();
      setTimeLeft(t);
      // Stop interval once expired
      if (t.isExpired) clearInterval(intervalRef.current);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [expiresAt]);

  const formatted = timeLeft.isExpired
    ? 'Expired'
    : [
        timeLeft.days    > 0 ? `${timeLeft.days}d`    : '',
        timeLeft.hours   > 0 ? `${timeLeft.hours}h`   : '',
        timeLeft.minutes > 0 ? `${timeLeft.minutes}m` : '',
        `${timeLeft.seconds}s`,
      ].filter(Boolean).join(' ') + ' left';

  return { ...timeLeft, formatted };
}