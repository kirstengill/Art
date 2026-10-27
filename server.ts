import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  isAdminUid,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  getAdminContent,
  getAdminOrders,
  getAdminOverview,
  getAdminUsers,
  type AdminArtworkFilter,
  type AdminContentKind,
  type AdminRoleFilter,
  type AdminTimeframe,
} from './src/db/adminRepository.ts';
import {
  addCommentInDb,
  appendMessageToDb,
  checkArtworkPurchased,
  completePurchaseInDb,
  createOfferInDb,
  createPostInDb,
  createPurchaseIntentInDb,
  getArtists,
  getConversationsForParticipant,
  getOrCreateArtworkConversation,
  getPublicCatalog,
  getPurchasesForCollector,
  getPurchasedArtworkIds,
  removeArtworkListing,
  syncUserProfile,
  toggleFollowInDb,
  togglePostLikeInDb,
  toggleSavedArtworkInDb,
  transitionOfferStatusInDb,
  upsertArtworkListing,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  if (!process.env.ADMIN_UIDS?.split(',').some((uid) => uid.trim())) {
    console.warn(
      'ADMIN_UIDS is not configured; administrator endpoints will reject all requests.'
    );
  }

  app.use(express.json({ limit: '6mb' }));

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email;
      const { fullName, firstName, lastName, phoneNumber, bio, location } = req.body || {};
      const metadataRole = req.user!.user_metadata.role;
      const role =
        metadataRole === 'artist' ||
        metadataRole === 'collector' ||
        metadataRole === 'art_lover'
          ? metadataRole
          : undefined;
      const profile = await syncUserProfile({
        uid,
        email,
        fullName: fullName || req.user!.name,
        firstName,
        lastName,
        phoneNumber,
        role,
        bio,
        location,
        isAdmin: isAdminUid(uid),
      });
      res.json({ profile });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync profile.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/catalog', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const catalog = await getPublicCatalog(req.user?.uid);
      res.json(catalog);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load catalog.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/artists', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const artists = await getArtists();
      res.json({ artists });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load artists.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/overview', requireAuth, requireAdmin, async (req, res) => {
    const rawTimeframe = req.query.timeframe;
    let timeframe: AdminTimeframe = 30;
    if (rawTimeframe === '7') timeframe = 7;
    else if (rawTimeframe === '30' || rawTimeframe === undefined) timeframe = 30;
    else if (rawTimeframe === '90') timeframe = 90;
    else if (rawTimeframe === 'all') timeframe = 'all';
    else {
      res.status(400).json({ error: 'Timeframe must be 7, 30, 90, or all.' });
      return;
    }
    try {
      res.json(await getAdminOverview(timeframe));
    } catch {
      console.error('Admin overview query failed.');
      res.status(500).json({ error: 'Unable to load administrator overview.' });
    }
  });

  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    const role = typeof req.query.role === 'string' ? req.query.role : 'all';
    if (!['all', 'admin', 'artist', 'collector', 'art_lover'].includes(role)) {
      res.status(400).json({ error: 'Invalid account type filter.' });
      return;
    }
    try {
      res.json(
        await getAdminUsers({
          page: req.query.page,
          pageSize: req.query.pageSize,
          role: role as AdminRoleFilter,
          search: typeof req.query.search === 'string' ? req.query.search : '',
        })
      );
    } catch {
      console.error('Admin users query failed.');
      res.status(500).json({ error: 'Unable to load administrator user records.' });
    }
  });

  app.get('/api/admin/content', requireAuth, requireAdmin, async (req, res) => {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'artworks';
    const artworkFilter =
      typeof req.query.filter === 'string' ? req.query.filter : 'all';
    if (!['artworks', 'community'].includes(kind)) {
      res.status(400).json({ error: 'Invalid content type filter.' });
      return;
    }
    if (!['all', 'direct'].includes(artworkFilter)) {
      res.status(400).json({ error: 'Invalid artwork filter.' });
      return;
    }
    try {
      res.json(
        await getAdminContent({
          kind: kind as AdminContentKind,
          page: req.query.page,
          pageSize: req.query.pageSize,
          search: typeof req.query.search === 'string' ? req.query.search : '',
          artistName: typeof req.query.artistName === 'string' ? req.query.artistName : '',
          artworkFilter: artworkFilter as AdminArtworkFilter,
        })
      );
    } catch {
      console.error('Admin content query failed.');
      res.status(500).json({ error: 'Unable to load administrator content records.' });
    }
  });

  app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(
        await getAdminOrders({
          page: req.query.page,
          pageSize: req.query.pageSize,
        })
      );
    } catch {
      console.error('Admin orders query failed.');
      res.status(500).json({ error: 'Unable to load purchase-intent records.' });
    }
  });

  app.post('/api/artworks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const artwork = await upsertArtworkListing(uid, req.body);
      res.status(201).json({ artwork });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save artwork.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.put('/api/artworks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const artwork = await upsertArtworkListing(req.user!.uid, {
        ...req.body,
        id: req.params.id,
      });
      res.json({ artwork });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update artwork.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/artworks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await removeArtworkListing(req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove artwork.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/artworks/:id/save', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await toggleSavedArtworkInDb(req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update saved state.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/artists/:id/follow', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await toggleFollowInDb(req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update follow status.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const post = await createPostInDb(req.user!.uid, req.body);
      res.status(201).json({ post });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create post.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const comment = await addCommentInDb(req.user!.uid, req.params.id, req.body.body);
      res.status(201).json({ comment });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add comment.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/posts/:id/like', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await togglePostLikeInDb(req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle appreciation.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getConversationsForParticipant(req.user!.uid);
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/conversations/open', requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversation = await getOrCreateArtworkConversation(
        req.user!.uid,
        req.body.artworkId
      );
      res.status(201).json({ conversation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to open conversation.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const message = await appendMessageToDb(
        req.user!.uid,
        req.params.id,
        req.body.body,
        req.body.attachmentName
      );
      res.status(201).json({ message });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Failed to send message.';
      const status = errMessage.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: errMessage });
    }
  });

  app.post('/api/conversations/:id/offers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const offer = await createOfferInDb({
        senderUid: req.user!.uid,
        conversationId: req.params.id,
        amount: Number(req.body.amount),
        currency: req.body.currency || 'USD',
        note: req.body.note || '',
      });
      res.status(201).json({ offer });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Failed to create offer.';
      const status = errMessage.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: errMessage });
    }
  });

  app.post('/api/offers/:id/respond', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await transitionOfferStatusInDb({
        actorUid: req.user!.uid,
        offerId: req.params.id,
        action: req.body.action,
        counterAmount: req.body.counterAmount ? Number(req.body.counterAmount) : undefined,
        note: req.body.note,
      });
      res.json(result);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Failed to respond to offer.';
      const status = errMessage.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: errMessage });
    }
  });

  app.post('/api/orders/intent', requireAuth, async (req: AuthRequest, res) => {
    try {
      const order = await createPurchaseIntentInDb({
        buyerUid: req.user!.uid,
        artworkId: req.body.artworkId,
        offerId: req.body.offerId,
        shippingCity: req.body.shippingCity || '',
        collectorNote: req.body.collectorNote || '',
      });
      res.status(201).json({ order });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Failed to create order intent.';
      const status = errMessage.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: errMessage });
    }
  });

  // Complete a purchase and record ownership
  app.post('/api/purchases/complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { orderId, artworkId, amount, currency } = req.body;
      const result = await completePurchaseInDb({
        orderId,
        artworkId,
        collectorId: req.user!.uid,
        amount: Number(amount),
        currency: currency || 'USD',
      });
      res.status(201).json(result);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Failed to complete purchase.';
      const status = errMessage.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: errMessage });
    }
  });

  // Get all purchases for a collector
  app.get('/api/purchases', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getPurchasesForCollector(req.user!.uid);
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load purchases.';
      res.status(500).json({ error: message });
    }
  });

  // Check if a specific artwork has been purchased by the current user
  app.get('/api/purchases/check/:artworkId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const isPurchased = await checkArtworkPurchased(req.params.artworkId, req.user!.uid);
      res.json({ isPurchased });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to check purchase status.';
      res.status(500).json({ error: message });
    }
  });

  // Get list of purchased artwork IDs for a collector
  app.get('/api/purchases/artwork-ids', requireAuth, async (req: AuthRequest, res) => {
    try {
      const artworkIds = await getPurchasedArtworkIds(req.user!.uid);
      res.json({ artworkIds });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load purchased artwork IDs.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArtVerse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
