import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  getSupabaseServiceClient,
} from './src/lib/supabase-server.ts';
import {
  getAdminCollectorApprovals,
  getAdminContent,
  getAdminOrders,
  getAdminOverview,
  getAdminUsers,
  updateAdminCollectorApproval,
  updateAdminOrderStatus,
  type AdminArtworkFilter,
  type AdminContentKind,
  type AdminRoleFilter,
  type AdminTimeframe,
} from './src/db/adminRepository.ts';
import type { AdminCollectorApprovalFilter } from './src/types/admin.ts';
import {
  addArtworkToExhibition,
  addCommentInDb,
  appendMessageToDb,
  checkArtworkPurchased,
  createDonationInDb,
  createExhibitionInDb,
  createExhibitionSubmissionInDb,
  createOfferInDb,
  createPostInDb,
  createPurchaseIntentInDb,
  createPurchaseRequestInDb,
  getAllDonations,
  getArtists,
  getDonationsForArtist,
  getDonationsForDonor,
  getExhibitionArtworks,
  getExhibitionById,
  getExhibitions,
  getExhibitionSubmissions,
  getConversationsForParticipant,
  getOrCreateArtworkConversation,
  getPublicCatalog,
  getPurchasesForCollector,
  getPurchasedArtworkIds,
  removeArtworkFromExhibition,
  removeArtworkListing,
  syncUserProfile,
  toggleFollowInDb,
  togglePostLikeInDb,
  toggleSavedArtworkInDb,
  transitionOfferStatusInDb,
  upsertArtworkListing,
  updateExhibitionInDb,
  updateExhibitionSubmissionStatus,
  deleteExhibitionInDb,
  fromDatabase,
} from './src/db/repository.ts';
import type { ExhibitionStatus } from './src/types/artverse';
import { PurchaseRequestValidationError } from './src/utils/purchaseRequests.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createApp() {
  const app = express();

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
      });
      res.json({ profile });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync profile.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/catalog', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const profile = await req.supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user!.uid)
        .maybeSingle();
      if (!profile || String((profile as { role?: string }).role) !== 'collector') {
        res.status(403).json({ error: 'Collector account required to view artworks.' });
        return;
      }
      const catalog = await getPublicCatalog(req.supabase, req.user?.uid);
      res.json(catalog);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load catalog.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/artists', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const profile = await req.supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user!.uid)
        .maybeSingle();
      if (!profile || String((profile as { role?: string }).role) !== 'collector') {
        res.status(403).json({ error: 'Collector account required to view artists.' });
        return;
      }
      const artists = await getArtists(req.supabase);
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

  app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (
        typeof req.body?.status !== 'string' ||
        (req.body.source !== 'purchase_request' && req.body.source !== 'order_intent')
      ) {
        res.status(400).json({ error: 'A valid purchase request source and status are required.' });
        return;
      }
      res.json(
        await updateAdminOrderStatus(
          req.params.id,
          req.body.source,
          req.body.status
        )
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to update purchase request.';
      const status = /not found/i.test(message) ? 404 : /cannot move|invalid purchase request status/i.test(message) ? 400 : 500;
      if (status === 500) console.error('Admin purchase request update failed.');
      res.status(status).json({
        error: status === 500 ? 'Unable to update purchase request.' : message,
      });
    }
  });

  app.post('/api/artworks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const uid = req.user!.uid;
      const artwork = await upsertArtworkListing(req.supabase, uid, req.body);
      res.status(201).json({ artwork });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save artwork.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.put('/api/artworks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const artwork = await upsertArtworkListing(req.supabase, req.user!.uid, {
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
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await removeArtworkListing(req.supabase, req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove artwork.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/artworks/:id/save', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await toggleSavedArtworkInDb(req.supabase, req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update saved state.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/artists/:id/follow', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await toggleFollowInDb(req.supabase, req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update follow status.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const post = await createPostInDb(req.supabase, req.user!.uid, req.body);
      res.status(201).json({ post });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create post.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const comment = await addCommentInDb(req.supabase, req.user!.uid, req.params.id, req.body.body);
      res.status(201).json({ comment });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add comment.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/posts/:id/like', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await togglePostLikeInDb(req.supabase, req.user!.uid, req.params.id);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle appreciation.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const data = await getConversationsForParticipant(req.supabase, req.user!.uid);
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/conversations/open', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const conversation = await getOrCreateArtworkConversation(
        req.supabase,
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
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const message = await appendMessageToDb(
        req.supabase,
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
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const offer = await createOfferInDb(req.supabase, {
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
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await transitionOfferStatusInDb(req.supabase, {
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
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const order = await createPurchaseIntentInDb(req.supabase, {
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

  app.post('/api/purchase-requests', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const order = await createPurchaseRequestInDb(req.body);
      res.status(201).json({ order });
    } catch (error: unknown) {
      if (error instanceof PurchaseRequestValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Public purchase request could not be saved.');
      res.status(503).json({
        error: 'Unable to submit your request right now. Please try again later.',
      });
    }
  });

  // Purchase completion is unavailable until payment and delivery verification exist.
  app.post('/api/purchases/complete', requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({
      error: 'Purchase completion is unavailable until payment and delivery verification are configured.',
    });
  });

  // Get all purchases for a collector
  app.get('/api/purchases', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const data = await getPurchasesForCollector(req.supabase, req.user!.uid);
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load purchases.';
      res.status(500).json({ error: message });
    }
  });

  // Check if a specific artwork has been purchased by the current user
  app.get('/api/purchases/check/:artworkId', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const isPurchased = await checkArtworkPurchased(req.supabase, req.params.artworkId, req.user!.uid);
      res.json({ isPurchased });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to check purchase status.';
      res.status(500).json({ error: message });
    }
  });

  // Get list of purchased artwork IDs for a collector
  app.get('/api/purchases/artwork-ids', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const artworkIds = await getPurchasedArtworkIds(req.supabase, req.user!.uid);
      res.json({ artworkIds });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load purchased artwork IDs.';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // Donations
  // ============================================
  app.post('/api/donations', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const { data: profile } = await req.supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user!.uid)
        .maybeSingle();
      if (profile && String((profile as { role?: string }).role) === 'artist') {
        res.status(403).json({ error: 'Artist accounts cannot make donations.' });
        return;
      }
      const donation = await createDonationInDb(req.supabase, req.user!.uid, req.body);
      res.status(201).json({ donation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create donation.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/donations', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const donations = await getDonationsForDonor(req.supabase, req.user!.uid);
      res.json({ donations: donations.map((d) => fromDatabase(d)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load donations.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/donations/artist/:artistId', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const donations = await getDonationsForArtist(req.supabase, req.params.artistId);
      res.json({ donations: donations.map((d) => fromDatabase(d)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load artist donations.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/donations', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const db = getSupabaseServiceClient();
      const donations = await getAllDonations(db);
      res.json({ donations: donations.map((d) => fromDatabase(d)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load donations.';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // Exhibitions
  // ============================================
  app.get('/api/exhibitions', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const status = typeof req.query.status === 'string' ? (req.query.status as ExhibitionStatus) : undefined;
      const exhibitions = await getExhibitions(req.supabase, status);
      res.json({ exhibitions: exhibitions.map((e) => fromDatabase(e)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load exhibitions.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/exhibitions/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const exhibition = await getExhibitionById(req.supabase, req.params.id);
      if (!exhibition) {
        res.status(404).json({ error: 'Exhibition not found.' });
        return;
      }
      res.json({ exhibition: fromDatabase(exhibition) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load exhibition.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/exhibitions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const exhibition = await createExhibitionInDb(req.supabase, req.user!.uid, req.body);
      res.status(201).json({ exhibition });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create exhibition.';
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/exhibitions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const exhibition = await updateExhibitionInDb(req.supabase, req.params.id, req.user!.uid, req.body);
      res.json({ exhibition });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update exhibition.';
      const status = message.startsWith('Forbidden:') ? 403 : message === 'Exhibition not found.' ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/exhibitions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await deleteExhibitionInDb(req.supabase, req.params.id, req.user!.uid);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete exhibition.';
      const status = message.startsWith('Forbidden:') ? 403 : message === 'Exhibition not found.' ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/exhibitions/:id/artworks', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const artworks = await getExhibitionArtworks(req.supabase, req.params.id);
      res.json({ artworks: artworks.map((a) => fromDatabase(a)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load exhibition artworks.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/exhibitions/:id/artworks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const { artworkId } = req.body;
      if (!artworkId || typeof artworkId !== 'string') {
        res.status(400).json({ error: 'Artwork ID is required.' });
        return;
      }
      const result = await addArtworkToExhibition(req.supabase, req.params.id, artworkId);
      res.status(201).json({ result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add artwork to exhibition.';
      const status = message.startsWith('Forbidden:') ? 403 : message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/exhibitions/:id/artworks/:artworkId', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const result = await removeArtworkFromExhibition(req.supabase, req.params.id, req.params.artworkId);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove artwork from exhibition.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/exhibitions/submissions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const submission = await createExhibitionSubmissionInDb(req.supabase, req.user!.uid, req.body);
      res.status(201).json({ submission });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create submission.';
      const status = message.startsWith('Forbidden:') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/exhibitions/:id/submissions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const submissions = await getExhibitionSubmissions(req.supabase, req.params.id);
      res.json({ submissions: submissions.map((s) => fromDatabase(s)) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load submissions.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/exhibitions/submissions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.supabase) throw new Error('Supabase database access is not configured.');
      const { status, notes } = req.body;
      if (!status) {
        res.status(400).json({ error: 'Status is required.' });
        return;
      }
      const submission = await updateExhibitionSubmissionStatus(
        req.supabase,
        req.params.id,
        req.user!.uid,
        status,
        notes
      );
      res.json({ submission });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update submission.';
      const statusCode = message.startsWith('Forbidden:') ? 403 : message === 'Submission not found.' ? 404 : 400;
      res.status(statusCode).json({ error: message });
    }
  });

  // ============================================
  // Admin: Collector Approvals
  // ============================================
  app.get('/api/admin/collector-approvals', requireAuth, requireAdmin, async (req, res) => {
    try {
      const filter = typeof req.query.filter === 'string' ? (req.query.filter as AdminCollectorApprovalFilter) : 'all';
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const pageSize = Math.min(50, Math.max(1, Math.floor(Number(req.query.pageSize) || 20)));
      const result = await getAdminCollectorApprovals({ page, pageSize, filter, search });
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Unable to load collector approvals.' });
    }
  });

  app.patch('/api/admin/collector-approvals/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { action, rejectionReason } = req.body;
      if (action !== 'approve' && action !== 'reject') {
        res.status(400).json({ error: 'A valid approval action is required.' });
        return;
      }
      const result = await updateAdminCollectorApproval(req.params.id, action, rejectionReason);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to update collector approval.';
      const status = /not found/i.test(message) ? 404 : /invalid|cannot move|already/i.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  return app;
}

export const app = createApp();
export default app;

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);

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
    console.log(`Louvre Singa server listening on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  void startServer();
}
