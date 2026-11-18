import { supabase } from '../lib/supabase';
import type { OnlineClass, OnlineClassInput } from '../types/onlineClasses';

function requireSupabase() {
  if (!supabase) throw new Error('Online Classes are unavailable because Supabase is not configured.');
  return supabase;
}

function fromRow(row: {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  instructor_name: string;
  category: OnlineClass['category'];
  provider: OnlineClass['provider'];
  video_url: string;
  video_id: string;
  scheduled_at: string | null;
  status: OnlineClass['status'];
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): OnlineClass {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    instructorName: row.instructor_name,
    category: row.category,
    provider: row.provider,
    videoUrl: row.video_url,
    videoId: row.video_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    published: row.published,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: OnlineClassInput) {
  return {
    title: input.title,
    description: input.description,
    thumbnail_url: input.thumbnailUrl,
    instructor_name: input.instructorName,
    category: input.category,
    provider: input.provider,
    video_url: input.videoUrl,
    video_id: input.videoId,
    scheduled_at: input.scheduledAt,
    status: input.status,
    published: input.published,
  };
}

export async function fetchOnlineClasses(): Promise<OnlineClass[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('online_classes')
    .select('*')
    .eq('published', true)
    .order('scheduled_at', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Unable to load online classes: ${error.message}`);
  return (data || []).map(fromRow);
}

export async function fetchAllOnlineClasses(): Promise<OnlineClass[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('online_classes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load classes for administration: ${error.message}`);
  return (data || []).map(fromRow);
}

export async function createOnlineClass(
  input: OnlineClassInput,
  createdBy: string
): Promise<OnlineClass> {
  const { data, error } = await requireSupabase()
    .from('online_classes')
    .insert({ ...toRow(input), created_by: createdBy })
    .select('*')
    .single();
  if (error) throw new Error(`Unable to create class: ${error.message}`);
  return fromRow(data);
}

export async function updateOnlineClass(
  id: string,
  input: OnlineClassInput
): Promise<OnlineClass> {
  const { data, error } = await requireSupabase()
    .from('online_classes')
    .update(toRow(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(`Unable to update class: ${error.message}`);
  return fromRow(data);
}

export async function deleteOnlineClass(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('online_classes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Unable to delete class: ${error.message}`);
}
