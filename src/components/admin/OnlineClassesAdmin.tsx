import React, { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useArtVerse } from '../../context/ArtVerseContext';
import {
  createOnlineClass,
  deleteOnlineClass,
  fetchAllOnlineClasses,
  updateOnlineClass,
} from '../../db/onlineClassesRepository';
import { supabase } from '../../lib/supabase';
import type {
  OnlineClass,
  OnlineClassCategory,
  OnlineClassInput,
  OnlineClassStatus,
} from '../../types/onlineClasses';
import { parseOnlineClassVideoUrl } from '../../utils/onlineClassVideo';

const CATEGORIES: Array<{ value: OnlineClassCategory; label: string }> = [
  { value: 'live_class', label: 'Live Class' },
  { value: 'demonstration', label: 'Demonstration' },
  { value: 'recorded_tutorial', label: 'Recorded Tutorial' },
  { value: 'art_tutorial', label: 'Art Tutorial' },
];

const STATUSES: OnlineClassStatus[] = [
  'draft',
  'scheduled',
  'live',
  'completed',
  'cancelled',
];

type FormValues = {
  title: string;
  description: string;
  instructorName: string;
  category: OnlineClassCategory;
  videoUrl: string;
  scheduledAt: string;
  status: OnlineClassStatus;
  published: boolean;
  thumbnailUrl: string | null;
};

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  instructorName: '',
  category: 'live_class',
  videoUrl: '',
  scheduledAt: '',
  status: 'draft',
  published: false,
  thumbnailUrl: null,
};

function inputDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function dateLabel(value: string | null): string {
  if (!value) return 'No date set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
}

export const OnlineClassesAdmin: React.FC = () => {
  const { currentUser } = useArtVerse();
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      setClasses(await fetchAllOnlineClasses());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load online classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const editClass = (item: OnlineClass) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      instructorName: item.instructorName,
      category: item.category,
      videoUrl: item.videoUrl,
      scheduledAt: inputDate(item.scheduledAt),
      status: item.status,
      published: item.published,
      thumbnailUrl: item.thumbnailUrl,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only administrators can upload class thumbnails.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Class thumbnails must be JPEG, PNG, or WebP images.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Class thumbnails must be 5 MB or smaller.');
      return;
    }
    if (!supabase) {
      setError('Thumbnail upload is unavailable because Supabase is not configured.');
      return;
    }

    const storage = supabase.storage;
    setUploading(true);
    setError(null);
    try {
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
      const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await storage
        .from('online-class-thumbnails')
        .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Unable to upload thumbnail: ${uploadError.message}`);
      setForm((value) => ({
        ...value,
        thumbnailUrl: storage.from('online-class-thumbnails').getPublicUrl(path).data.publicUrl,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload thumbnail.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only administrators can manage online classes.');
      return;
    }
    if (!form.title.trim() || !form.instructorName.trim()) {
      setError('Add a class title and instructor name.');
      return;
    }
    if (form.published && form.status === 'draft') {
      setError('A draft must be changed to another status before it can be published.');
      return;
    }
    if (form.status === 'scheduled' && !form.scheduledAt) {
      setError('Add a starting date and time before scheduling a class.');
      return;
    }

    setSaving(true);
    try {
      const video = parseOnlineClassVideoUrl(form.videoUrl);
      const input: OnlineClassInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl,
        instructorName: form.instructorName.trim(),
        category: form.category,
        provider: video.provider,
        videoUrl: form.videoUrl.trim(),
        videoId: video.videoId,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        status: form.status,
        published: form.published,
      };

      if (editingId) {
        await updateOnlineClass(editingId, input);
      } else {
        await createOnlineClass(input, currentUser.id);
      }
      resetForm();
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save class.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: OnlineClass) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteOnlineClass(item.id);
      if (editingId === item.id) resetForm();
      await loadClasses();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete class.');
    }
  };

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-7">
      {error && (
        <div role="alert" className="rounded-xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d3b578]">
              {editingId ? 'Update your program' : 'Add to the program'}
            </p>
            <h2 className="mt-1 font-serif text-2xl">{editingId ? 'Edit class' : 'Create a class'}</h2>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70 hover:bg-white/10">
              <X className="h-3.5 w-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/70">
            Class title *
            <input required value={form.title} onChange={(event) => setField('title', event.target.value)} maxLength={180} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white" />
          </label>
          <label className="text-xs text-white/70">
            Instructor or presenter *
            <input required value={form.instructorName} onChange={(event) => setField('instructorName', event.target.value)} maxLength={120} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white" />
          </label>
          <label className="text-xs text-white/70 sm:col-span-2">
            Description
            <textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={4} maxLength={10000} className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white" />
          </label>
          <label className="text-xs text-white/70 sm:col-span-2">
            YouTube or supported TikTok URL *
            <input required type="url" value={form.videoUrl} onChange={(event) => setField('videoUrl', event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/30" />
            <span className="mt-1 block text-[10px] text-white/45">Paste a video link. Louvre Singa generates the player automatically; iframe code is not accepted.</span>
          </label>
          <label className="text-xs text-white/70">
            Category
            <select value={form.category} onChange={(event) => setField('category', event.target.value as OnlineClassCategory)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#262420] px-3 py-2.5 text-sm text-white">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/70">
            Status
            <select value={form.status} onChange={(event) => setField('status', event.target.value as OnlineClassStatus)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#262420] px-3 py-2.5 text-sm text-white">
              {STATUSES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/70">
            Starting date and time
            <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setField('scheduledAt', event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
          </label>
          <div className="text-xs text-white/70">
            Thumbnail image
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-xs text-white/80 hover:bg-white/10">
                <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void handleUpload(event.target.files?.[0])} className="sr-only" />
              </label>
              {form.thumbnailUrl && (
                <button type="button" onClick={() => setField('thumbnailUrl', null)} className="inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white">
                  <X className="h-3 w-3" /> Remove thumbnail
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-xs text-white/75">
            <input type="checkbox" checked={form.published} onChange={(event) => setField('published', event.target.checked)} className="accent-[#d3b578]" />
            Publish this class
          </label>
        </div>

        {form.thumbnailUrl && (
          <div className="mt-4 flex items-center gap-3">
            <img src={form.thumbnailUrl} alt="Class thumbnail preview" className="h-16 w-24 rounded-lg object-cover" />
            <span className="text-[11px] text-white/50">Thumbnail preview</span>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-[#d3b578] px-5 py-3 text-xs font-semibold text-[#211c13] hover:bg-[#e2c992] disabled:opacity-50">
            {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create class'}
          </button>
          <span className="text-[10px] text-white/40">Video playback uses the official platform player.</span>
        </div>
      </form>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">All classes</h2>
          <span className="text-xs text-white/50">{classes.length} total</span>
        </div>
        {loading ? (
          <p role="status" className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/55">Loading classes…</p>
        ) : classes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-white/55">No classes have been created yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-white/[0.06] text-white/55">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-[10px] text-white/45">{item.instructorName} · {item.provider}</p>
                    </td>
                    <td className="px-4 py-4 capitalize text-white/65">{item.status}</td>
                    <td className="px-4 py-4 text-white/55">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />{dateLabel(item.scheduledAt)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={item.published ? 'text-emerald-300' : 'text-white/45'}>{item.published ? 'Published' : 'Unpublished'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => editClass(item)} className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/70 hover:bg-white/10">Edit</button>
                        <button type="button" onClick={() => void handleDelete(item)} aria-label={`Delete ${item.title}`} className="rounded-md border border-red-300/20 p-1.5 text-red-200 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
