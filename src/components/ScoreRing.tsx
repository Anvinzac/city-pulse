import { motion } from 'framer-motion';

interface ScoreRingProps {
  score: number; // 0-10
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  className?: string;
}

export function ScoreRing({ score, size = 64, strokeWidth = 4, animated = true, className = '' }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 10;
  const offset = circumference * (1 - progress);

  const color = score >= 8 ? 'hsl(var(--cyan))' : score >= 5 ? 'hsl(var(--amber))' : 'hsl(var(--coral))';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <span className="absolute font-display font-bold text-tabular" style={{ fontSize: size * 0.3, color }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}
