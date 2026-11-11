import type { AvailabilityStatus, SaleMode } from '../types/artverse';

export interface PurchaseRequestInput {
  requestId: string;
  artworkId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  deliveryLocation: string;
  deliveryAddress: string;
  instructions: string;
}

export class PurchaseRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseRequestValidationError';
  }
}

export class PurchaseWorkflowError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = 'PurchaseWorkflowError';
  }
}

export function isArtworkDirectlyPurchasable(
  availability: AvailabilityStatus | string,
  saleMode: SaleMode | string
): boolean {
  return (
    availability === 'available' &&
    (saleMode === 'buy_now' || saleMode === 'buy_now_and_negotiation')
  );
}

export function parsePurchaseRequestInput(value: unknown): PurchaseRequestInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PurchaseRequestValidationError('A purchase request form is required.');
  }

  const body = value as Record<string, unknown>;
  const readText = (key: string, label: string, maxLength: number, required = true) => {
    const raw = body[key];
    if (raw === undefined || raw === null) {
      if (required) throw new PurchaseRequestValidationError(`${label} is required.`);
      return '';
    }
    if (typeof raw !== 'string') {
      throw new PurchaseRequestValidationError(`${label} must be text.`);
    }
    const text = raw.trim();
    if (required && !text) throw new PurchaseRequestValidationError(`${label} is required.`);
    if (text.length > maxLength) {
      throw new PurchaseRequestValidationError(`${label} must be ${maxLength} characters or fewer.`);
    }
    return text;
  };

  const requestId = readText('requestId', 'Request reference', 36);
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(requestId)) {
    throw new PurchaseRequestValidationError('The purchase request reference is invalid.');
  }

  const artworkId = readText('artworkId', 'Artwork', 128);
  const buyerName = readText('buyerName', 'Full name', 120);
  if (buyerName.length < 2) {
    throw new PurchaseRequestValidationError('Full name must contain at least 2 characters.');
  }

  const buyerPhone = readText('buyerPhone', 'Phone or WhatsApp number', 40);
  if (!/^[+()\d.\-\s]+$/.test(buyerPhone) || buyerPhone.replace(/\D/g, '').length < 7) {
    throw new PurchaseRequestValidationError('Enter a valid phone or WhatsApp number.');
  }

  const buyerEmail = readText('buyerEmail', 'Email address', 254, false);
  if (buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    throw new PurchaseRequestValidationError('Enter a valid email address.');
  }

  const deliveryLocation = readText('deliveryLocation', 'Delivery location', 160);
  const deliveryAddress = readText('deliveryAddress', 'Full delivery address', 500);
  if (deliveryAddress.length < 5) {
    throw new PurchaseRequestValidationError('Full delivery address must contain at least 5 characters.');
  }

  return {
    requestId,
    artworkId,
    buyerName,
    buyerPhone,
    buyerEmail,
    deliveryLocation,
    deliveryAddress,
    instructions: readText('instructions', 'Additional instructions', 2000, false),
  };
}
