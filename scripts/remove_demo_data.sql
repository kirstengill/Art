BEGIN;

CREATE TEMP TABLE art_universe_demo_profile_ids ON COMMIT DROP AS
SELECT id FROM profiles WHERE is_demo = true;

CREATE TEMP TABLE art_universe_demo_artwork_ids ON COMMIT DROP AS
SELECT artwork.id
FROM artworks AS artwork
LEFT JOIN profiles AS artist ON artist.id = artwork.artist_id
WHERE artwork.is_demo = true OR artist.is_demo = true;

CREATE TEMP TABLE art_universe_demo_conversation_ids ON COMMIT DROP AS
SELECT conversation.id
FROM conversations AS conversation
LEFT JOIN artworks AS artwork ON artwork.id = conversation.artwork_id
LEFT JOIN profiles AS collector ON collector.id = conversation.collector_id
LEFT JOIN profiles AS artist ON artist.id = conversation.artist_id
WHERE conversation.is_demo = true
   OR artwork.is_demo = true
   OR artist.is_demo = true
   OR collector.is_demo = true;

DELETE FROM orders AS purchase
WHERE purchase.artwork_id IN (SELECT id FROM art_universe_demo_artwork_ids)
   OR purchase.buyer_id IN (SELECT id FROM art_universe_demo_profile_ids)
   OR purchase.seller_id IN (SELECT id FROM art_universe_demo_profile_ids)
   OR purchase.offer_id IN (
     SELECT offer.id
     FROM artwork_offers AS offer
     WHERE offer.conversation_id IN (SELECT id FROM art_universe_demo_conversation_ids)
        OR offer.artwork_id IN (SELECT id FROM art_universe_demo_artwork_ids)
        OR offer.sender_id IN (SELECT id FROM art_universe_demo_profile_ids)
        OR offer.recipient_id IN (SELECT id FROM art_universe_demo_profile_ids)
   );

DELETE FROM conversations
WHERE id IN (SELECT id FROM art_universe_demo_conversation_ids);

DELETE FROM posts AS post
WHERE post.is_demo = true
   OR post.author_id IN (SELECT id FROM art_universe_demo_profile_ids);

DELETE FROM artworks
WHERE id IN (SELECT id FROM art_universe_demo_artwork_ids);

DELETE FROM users
WHERE uid IN (SELECT id FROM art_universe_demo_profile_ids);

DELETE FROM profiles
WHERE id IN (SELECT id FROM art_universe_demo_profile_ids);

COMMIT;
