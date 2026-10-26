import React from 'react';
import { formatMoney } from '../../utils/formatters';

interface ArtworkPriceProps {
  price: number;
  currency?: string;
  className?: string;
}

export const ArtworkPrice: React.FC<ArtworkPriceProps> = ({ price, currency = 'USD', className = '' }) => {
  return (
    <span className={`font-mono text-lg font-semibold text-[#141312] tabular-nums ${className}`}>
      {formatMoney(price, currency)}
    </span>
  );
};
