import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profiles = pgTable(
  'profiles',
  {
    id: text('id').primaryKey(), // Matches Supabase Auth user ID or seeded artist/collector ID
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    handle: text('handle').notNull(),
    role: text('role').notNull().default('collector'), // 'admin' | 'artist' | 'collector' | 'art_lover'
    avatarUrl: text('avatar_url'),
    coverUrl: text('cover_url'),
    bio: text('bio').notNull().default(''),
    location: text('location').notNull().default(''),
    discipline: text('discipline').notNull().default('Contemporary Fine Art'),
    verified: boolean('verified').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('profiles_role_idx').on(table.role)]
);

export const userAccountDetails = pgTable('user_account_details', {
  userId: text('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  location: text('location'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const artworks = pgTable(
  'artworks',
  {
    id: text('id').primaryKey(),
    artistId: text('artist_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(), // 'painting' | 'photography' | 'sculpture' | 'drawing' | 'digital_art'
    medium: text('medium').notNull(),
    dimensions: text('dimensions').notNull(),
    year: integer('year').notNull(),
    price: integer('price').notNull(),
    currency: text('currency').notNull().default('USD'),
    availability: text('availability').notNull().default('available'), // 'available' | 'reserved' | 'sold'
    saleMode: text('sale_mode').notNull().default('buy_now_and_negotiation'), // 'buy_now' | 'negotiation_only' | 'buy_now_and_negotiation'
    imageKey: text('image_key').notNull(), // Asset key or uploaded data URL
    provenance: text('provenance').notNull().default('Direct from the artist studio'),
    accessionNumber: text('accession_number').notNull(),
    editionInfo: text('edition_info').notNull().default('Unique 1 of 1 original work'),
    featured: boolean('featured').notNull().default(false),
    likesCount: integer('likes_count').notNull().default(0),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('artworks_artist_idx').on(table.artistId),
    index('artworks_category_idx').on(table.category),
  ]
);

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    artworkId: text('artwork_id').references(() => artworks.id, { onDelete: 'set null' }),
    title: text('title').notNull().default(''),
    body: text('body').notNull(),
    imageKey: text('image_key'),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('posts_author_idx').on(table.authorId)]
);

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: text('author_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('comments_post_idx').on(table.postId)]
);

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    postId: text('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('likes_post_user_unique').on(table.postId, table.userId)]
);

export const follows = pgTable(
  'follows',
  {
    id: serial('id').primaryKey(),
    followerId: text('follower_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    followingId: text('following_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('follows_pair_unique').on(table.followerId, table.followingId)]
);

export const collections = pgTable(
  'collections',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('collections_owner_idx').on(table.ownerId)]
);

export const collectionItems = pgTable(
  'collection_items',
  {
    id: serial('id').primaryKey(),
    collectionId: text('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    artworkId: text('artwork_id')
      .references(() => artworks.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('collection_item_unique').on(table.collectionId, table.artworkId)]
);

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    artworkId: text('artwork_id')
      .references(() => artworks.id, { onDelete: 'cascade' })
      .notNull(),
    collectorId: text('collector_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    artistId: text('artist_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    lastMessagePreview: text('last_message_preview').notNull().default(''),
    lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('conversations_artwork_idx').on(table.artworkId),
    index('conversations_collector_idx').on(table.collectorId),
    index('conversations_artist_idx').on(table.artistId),
  ]
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: serial('id').primaryKey(),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    profileId: text('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    unreadCount: integer('unread_count').notNull().default(0),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('conv_participant_unique').on(table.conversationId, table.profileId),
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: text('sender_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    body: text('body').notNull(),
    attachmentName: text('attachment_name'),
    messageType: text('message_type').notNull().default('text'), // 'text' | 'offer_event' | 'system'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('messages_conversation_idx').on(table.conversationId)]
);

export const artworkOffers = pgTable(
  'artwork_offers',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    artworkId: text('artwork_id')
      .references(() => artworks.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: text('sender_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    recipientId: text('recipient_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired'
    note: text('note').notNull().default(''),
    parentOfferId: text('parent_offer_id'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('offers_conversation_idx').on(table.conversationId),
    index('offers_artwork_idx').on(table.artworkId),
  ]
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    artworkId: text('artwork_id')
      .references(() => artworks.id, { onDelete: 'cascade' })
      .notNull(),
    buyerId: text('buyer_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    sellerId: text('seller_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    offerId: text('offer_id').references(() => artworkOffers.id, { onDelete: 'set null' }),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('intent_created'), // 'intent_created' | 'awaiting_payment' | 'cancelled' | 'completed'
    shippingCity: text('shipping_city').notNull().default(''),
    collectorNote: text('collector_note').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('orders_buyer_idx').on(table.buyerId)]
);

export const purchases = pgTable(
  'purchases',
  {
    id: text('id').primaryKey(),
    artworkId: text('artwork_id')
      .references(() => artworks.id, { onDelete: 'cascade' })
      .notNull(),
    collectorId: text('collector_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: text('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    purchasePrice: integer('purchase_price').notNull(),
    currency: text('currency').notNull().default('USD'),
    purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  },
  (table) => [
    index('purchases_collector_idx').on(table.collectorId),
    index('purchases_artwork_idx').on(table.artworkId),
    uniqueIndex('purchases_unique').on(table.artworkId, table.collectorId),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    recipientId: text('recipient_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    linkUrl: text('link_url').notNull().default('/'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('notifications_recipient_idx').on(table.recipientId)]
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  artworks: many(artworks),
  posts: many(posts),
  collections: many(collections),
}));

export const artworksRelations = relations(artworks, ({ one, many }) => ({
  artist: one(profiles, {
    fields: [artworks.artistId],
    references: [profiles.id],
  }),
  conversations: many(conversations),
  offers: many(artworkOffers),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(profiles, {
    fields: [posts.authorId],
    references: [profiles.id],
  }),
  artwork: one(artworks, {
    fields: [posts.artworkId],
    references: [artworks.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(profiles, {
    fields: [comments.authorId],
    references: [profiles.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  artwork: one(artworks, {
    fields: [conversations.artworkId],
    references: [artworks.id],
  }),
  collector: one(profiles, {
    fields: [conversations.collectorId],
    references: [profiles.id],
  }),
  artist: one(profiles, {
    fields: [conversations.artistId],
    references: [profiles.id],
  }),
  messages: many(messages),
  offers: many(artworkOffers),
}));
