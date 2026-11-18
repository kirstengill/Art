CREATE TABLE public.online_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 180),
  description text NOT NULL DEFAULT '',
  thumbnail_url text,
  instructor_name text NOT NULL CHECK (length(btrim(instructor_name)) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (
    category IN ('live_class', 'demonstration', 'recorded_tutorial', 'art_tutorial')
  ),
  provider text NOT NULL CHECK (provider IN ('youtube', 'tiktok')),
  video_url text NOT NULL,
  video_id text NOT NULL,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')
  ),
  published boolean NOT NULL DEFAULT false,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT online_classes_scheduled_time_check CHECK (
    status <> 'scheduled' OR scheduled_at IS NOT NULL
  ),
  CONSTRAINT online_classes_draft_visibility_check CHECK (
    NOT published OR status <> 'draft'
  ),
  CONSTRAINT online_classes_video_url_check CHECK (
    (
      provider = 'youtube'
      AND video_id ~ '^[A-Za-z0-9_-]{11}$'
      AND video_url ~* '^https://(www\.|m\.)?youtube\.com/(watch\?v=|live/|embed/|shorts/)[A-Za-z0-9_-]{11}([?&#][^[:space:]]*)?$'
      OR provider = 'youtube'
      AND video_id ~ '^[A-Za-z0-9_-]{11}$'
      AND video_url ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}([?&#][^[:space:]]*)?$'
    )
    OR (
      provider = 'tiktok'
      AND video_id ~ '^[0-9]{10,25}$'
      AND video_url ~* '^https://(www\.|m\.)?tiktok\.com/@[^/[:space:]]+/video/[0-9]{10,25}([?&#][^[:space:]]*)?$'
    )
  )
);

CREATE INDEX online_classes_published_schedule_idx
  ON public.online_classes (published, status, scheduled_at);

CREATE OR REPLACE FUNCTION public.online_classes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER online_classes_set_updated_at
  BEFORE UPDATE ON public.online_classes
  FOR EACH ROW EXECUTE FUNCTION public.online_classes_set_updated_at();

ALTER TABLE public.online_classes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.online_classes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.online_classes TO authenticated;

CREATE POLICY online_classes_read_published
  ON public.online_classes
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.is_demo = false
        AND (
          (profile.role IN ('artist', 'collector') AND profile.account_status IN ('active', 'pending'))
          OR (profile.role = 'admin' AND profile.account_status = 'active')
        )
    )
  );

CREATE POLICY online_classes_admin_read_all
  ON public.online_classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE POLICY online_classes_admin_insert
  ON public.online_classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE POLICY online_classes_admin_update
  ON public.online_classes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE POLICY online_classes_admin_delete
  ON public.online_classes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE TABLE public.class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.online_classes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);

CREATE INDEX class_enrollments_user_idx ON public.class_enrollments (user_id, enrolled_at DESC);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.class_enrollments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_enrollments TO authenticated;

CREATE POLICY class_enrollments_select_own
  ON public.class_enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY class_enrollments_insert_own
  ON public.class_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.account_status IN ('active', 'pending')
        AND profile.is_demo = false
        AND profile.role IN ('artist', 'collector')
    )
    AND EXISTS (
      SELECT 1 FROM public.online_classes AS class
      WHERE class.id = class_id AND class.published = true
    )
  );

CREATE POLICY class_enrollments_update_own
  ON public.class_enrollments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY class_enrollments_delete_own
  ON public.class_enrollments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'online-class-thumbnails',
  'online-class-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY online_class_thumbnails_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'online-class-thumbnails');

CREATE POLICY online_class_thumbnails_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'online-class-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE POLICY online_class_thumbnails_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'online-class-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  )
  WITH CHECK (
    bucket_id = 'online-class-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );

CREATE POLICY online_class_thumbnails_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'online-class-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.role = 'admin'
        AND profile.account_status = 'active'
        AND profile.is_demo = false
    )
  );
