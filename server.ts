import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  addCommentInDb,
  appendMessageToDb,
  createOfferInDb,
  createPostInDb,
  createPurchaseIntentInDb,
  getConversationsForParticipant,
  getOrCreateArtworkConversation,
  getPublicCatalog,
  removeArtworkListing,
  syncUserProfile,
  toggleFollowInDb,
  togglePostLikeInDb,
  toggleSavedArtworkInDb,
  transitionOfferStatusInDb,
  upsertArtworkListing,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '6mb' }));

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@artverse.user`;
      const { fullName, role, bio, location } = req.body || {};
      const profile = await syncUserProfile({
        uid,
        email,
        fullName: fullName || req.user!.name,
        role,
        bio,
        location,
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

  app.post('/api/artworks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await syncUserProfile({
        uid,
        email: req.user!.email || `${uid}@artverse.user`,
        fullName: req.user!.name,
      });
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
      res.status(400).json({ error: message });
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
      res.status(400).json({ error: errMessage });
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
