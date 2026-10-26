import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtVerse } from '../../context/ArtVerseContext';
import { motion } from 'motion/react';

interface PurchaseButtonProps {
  artworkId: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  artworkId,
  disabled = false,
  className = '',
  children = 'Buy Artwork',
}) => {
  const navigate = useNavigate();
  const { currentUser } = useArtVerse();

  const handleClick = () => {
    if (disabled) return;
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/artwork/${artworkId}` } } });
      return;
    }
    navigate(`/artwork/${artworkId}`);
  };

  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        background: disabled ? '#9A9184' : 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
        color: '#FAF8F3',
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(179, 139, 64, 0.3)',
      }}
    >
      {children}
    </motion.button>
  );
};
