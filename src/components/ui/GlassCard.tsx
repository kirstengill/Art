import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  blur?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'panel';
}

const GlassCardBase: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = false,
  blur = 'md',
  variant = 'card',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const blurClass = blur === 'sm' ? 'backdrop-blur-sm' : blur === 'lg' ? 'backdrop-blur-lg' : 'backdrop-blur-md';
  const surfaceClass =
    variant === 'panel'
      ? 'bg-black/55 border-white/30 shadow-[0_18px_60px_rgba(0,0,0,0.28)]'
      : 'bg-white/70 border-white/40 shadow-[0_8px_32px_rgba(20,19,18,0.08)]';

  return (
    <motion.div
      whileHover={hoverable && !shouldReduceMotion ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`${surfaceClass} ${blurClass} border rounded-2xl transition-all duration-300 ${className}`}
      style={{
        backdropFilter: variant === 'panel' ? 'blur(22px) saturate(145%)' : 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: variant === 'panel' ? 'blur(22px) saturate(145%)' : 'blur(12px) saturate(180%)',
      }}
    >
      {children}
    </motion.div>
  );
};

export const GlassCard: React.FC<GlassCardProps> = (props) => (
  <GlassCardBase {...props} />
);

export const GlassPanel: React.FC<Omit<GlassCardProps, 'variant'>> = (props) => (
  <GlassCardBase {...props} variant="panel" />
);
