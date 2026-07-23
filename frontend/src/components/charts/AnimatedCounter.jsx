import React, { useState, useEffect, useRef, memo } from 'react';
import { Typography, Box } from '@mui/material';

const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  color = 'text.primary',
  variant = 'h4',
  fontWeight = 700,
  sx = {},
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const startValue = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const targetValue = Number(value) || 0;
    startValue.current = displayValue;
    startTime.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (targetValue - startValue.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [value, duration]);

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <Typography
      variant={variant}
      sx={{
        fontWeight,
        color,
        fontFamily: '"JetBrains Mono", monospace',
        letterSpacing: '-0.02em',
        ...sx,
      }}
    >
      {prefix}{formatted}{suffix}
    </Typography>
  );
});

export default AnimatedCounter;
