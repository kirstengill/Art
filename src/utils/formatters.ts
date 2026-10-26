import type {
  ArtworkCategory,
  AvailabilityStatus,
  OfferStatus,
  SaleMode,
  UserRole,
} from '../types/artverse';

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()} ${currency}`;
  }
}

export function formatCategoryLabel(category: ArtworkCategory): string {
  const map: Record<ArtworkCategory, string> = {
    painting: 'Painting',
    photography: 'Photography',
    sculpture: 'Sculpture',
    drawing: 'Drawing',
    digital_art: 'Digital Art',
  };
  return map[category] || category;
}

export function formatSaleModeLabel(mode: SaleMode): string {
  const map: Record<SaleMode, string> = {
    buy_now: 'Direct Purchase',
    negotiation_only: 'By Offer Only',
    buy_now_and_negotiation: 'Direct Purchase · Open to Offers',
  };
  return map[mode] || mode;
}

export function formatAvailabilityLabel(status: AvailabilityStatus): string {
  const map: Record<AvailabilityStatus, string> = {
    available: 'Available',
    reserved: 'Reserved — On Hold',
    sold: 'Acquired',
  };
  return map[status] || status;
}

export function formatOfferStatusLabel(status: OfferStatus): string {
  const map: Record<OfferStatus, string> = {
    pending: 'Pending Response',
    accepted: 'Offer Accepted',
    rejected: 'Declined',
    countered: 'Countered',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
  };
  return map[status] || status;
}

export function formatRoleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    artist: 'Artist',
    collector: 'Collector',
    art_lover: 'Art Lover',
  };
  return map[role] || role;
}

export function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatTimeStamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
