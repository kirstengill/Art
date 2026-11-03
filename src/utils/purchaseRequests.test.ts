import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isArtworkDirectlyPurchasable,
  parsePurchaseRequestInput,
  PurchaseRequestValidationError,
} from './purchaseRequests.ts';

test('only available artworks with a direct-purchase sale mode can be bought', () => {
  assert.equal(isArtworkDirectlyPurchasable('available', 'buy_now'), true);
  assert.equal(isArtworkDirectlyPurchasable('available', 'buy_now_and_negotiation'), true);
  assert.equal(isArtworkDirectlyPurchasable('available', 'negotiation_only'), false);
  assert.equal(isArtworkDirectlyPurchasable('reserved', 'buy_now'), false);
  assert.equal(isArtworkDirectlyPurchasable('sold', 'buy_now_and_negotiation'), false);
});

test('validates purchase request contact and delivery details', () => {
  const parsed = parsePurchaseRequestInput({
    requestId: '123e4567-e89b-12d3-a456-426614174000',
    artworkId: 'artwork-1',
    buyerName: 'Ada Buyer',
    buyerPhone: '+41 79 123 45 67',
    buyerEmail: 'ada@example.test',
    deliveryLocation: 'Zurich, Switzerland',
    deliveryAddress: '1 Gallery Street, 8000 Zurich',
    instructions: 'Please call on arrival.',
  });

  assert.equal(parsed.buyerName, 'Ada Buyer');
  assert.equal(parsed.deliveryAddress, '1 Gallery Street, 8000 Zurich');
});

test('rejects invalid required contact, address, email, and request identifiers', () => {
  const validInput = {
    requestId: '123e4567-e89b-12d3-a456-426614174000',
    artworkId: 'artwork-1',
    buyerName: 'Ada Buyer',
    buyerPhone: '+41 79 123 45 67',
    buyerEmail: '',
    deliveryLocation: 'Zurich, Switzerland',
    deliveryAddress: '1 Gallery Street, 8000 Zurich',
    instructions: '',
  };

  for (const invalid of [
    { ...validInput, buyerName: ' ' },
    { ...validInput, buyerPhone: 'abc' },
    { ...validInput, buyerEmail: 'not-an-email' },
    { ...validInput, deliveryAddress: 'Nope' },
    { ...validInput, requestId: 'not-a-uuid' },
  ]) {
    assert.throws(
      () => parsePurchaseRequestInput(invalid),
      PurchaseRequestValidationError
    );
  }
});
