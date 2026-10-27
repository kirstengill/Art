import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountRole,
  ArtworkCategory,
  AvailabilityStatus,
  OfferStatus,
  SaleMode,
} from '../types/artverse';

export const ARTWORK_IMAGE_BUCKET = 'artwork-images';

export interface SupabaseDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          handle: string;
          role: AccountRole;
          avatar_url: string | null;
          cover_url: string | null;
          bio: string;
          location: string;
          discipline: string;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      artworks: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          description: string;
          category: ArtworkCategory;
          medium: string;
          dimensions: string;
          year: number;
          price: number;
          currency: string;
          availability: AvailabilityStatus;
          sale_mode: SaleMode;
          image_key: string;
          provenance: string;
          accession_number: string;
          edition_info: string;
          featured: boolean;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          artwork_id: string;
          collector_id: string;
          artist_id: string;
          last_message_preview: string;
          last_message_at: string;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_name: string | null;
          message_type: 'text' | 'offer_event' | 'system';
          created_at: string;
        };
      };
      artwork_offers: {
        Row: {
          id: string;
          conversation_id: string;
          artwork_id: string;
          sender_id: string;
          recipient_id: string;
          amount: number;
          currency: string;
          status: OfferStatus;
          note: string;
          parent_offer_id: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('placeholder')
);

export const supabase: SupabaseClient<SupabaseDatabase> | null = isSupabaseConfigured
  ? createClient<SupabaseDatabase>(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function uploadArtworkImage(
  dataUrl: string,
  artistId: string
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase Storage is not configured.');
  }

  const imageMatch = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z\d+/]+={0,2})$/
  );
  if (!imageMatch) {
    throw new Error('Artwork images must be JPEG, PNG, or WebP files.');
  }

  const [, contentType, encodedImage] = imageMatch;
  const imageBytes = Uint8Array.from(atob(encodedImage), (character) =>
    character.charCodeAt(0)
  );
  if (imageBytes.byteLength > 4.5 * 1024 * 1024) {
    throw new Error('Artwork images must be under 4.5 MB.');
  }

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const imagePath = `${artistId}/${crypto.randomUUID()}.${extensionByType[contentType]}`;
  const { error } = await supabase.storage
    .from(ARTWORK_IMAGE_BUCKET)
    .upload(imagePath, imageBytes, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Unable to upload artwork image to Supabase Storage: ${error.message}`);
  }

  return supabase.storage.from(ARTWORK_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

/**
 * Subscribes to real-time message and offer updates for a specific conversation
 * when Supabase Realtime is configured.
 */
export function subscribeToConversationRealtime(
  conversationId: string,
  onEvent: () => void
): RealtimeChannel | null {
  if (!supabase) return null;

  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onEvent()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'artwork_offers',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onEvent()
    )
    .subscribe();
}
