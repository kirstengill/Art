import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ArtworkGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ArtworkGrid: React.FC<ArtworkGridProps> = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`grid min-w-0 grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
    >
      {children}
    </motion.div>
  );
};
