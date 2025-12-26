'use client';

interface CircularGaugeProps {
  value: number; // 0-100
  label: string;
  status?: 'ok' | 'warn' | 'critical';
}

export default function CircularGauge({ value, label, status = 'ok' }: CircularGaugeProps) {
  // Calculate arc path
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color based on status
  const colors = {
    ok: '#10b981',
    warn: '#fb923c',
    critical: '#ef4444'
  };
  const color = colors[status];

  return (
    <div className="gauge-container">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      
      {/* Center text */}
      <div className="gauge-text">
        {Math.round(value)}%
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
