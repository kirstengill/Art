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
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7 lg:gap-8 ${className}`}
    >
      {children}
    </motion.div>
  );
};
