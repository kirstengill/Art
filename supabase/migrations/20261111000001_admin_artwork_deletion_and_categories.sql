ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_category_check;
ALTER TABLE public.artworks
  ADD CONSTRAINT artworks_category_check
  CHECK (
    category IN (
      'ceramics',
      'mixed_media',
      'sculpture',
      'painting',
      'photography',
      'drawing',
      'digital_art',
      'other'
    )
  );

UPDATE public.artworks
SET sale_mode = 'buy_now'
WHERE availability = 'available'
  AND sale_mode <> 'buy_now';

ALTER TABLE public.purchase_requests
  ALTER COLUMN artwork_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS purchase_requests_artwork_id_fkey;
ALTER TABLE public.purchase_requests
  ADD CONSTRAINT purchase_requests_artwork_id_fkey
  FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.clear_artwork_media_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.purchase_requests
  SET artwork_image = ''
  WHERE artwork_id = OLD.id;

  UPDATE public.posts
  SET image_key = NULL
  WHERE artwork_id = OLD.id
    AND image_key = OLD.image_key;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS clear_artwork_media_references ON public.artworks;
CREATE TRIGGER clear_artwork_media_references
  BEFORE DELETE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.clear_artwork_media_references();

DROP POLICY IF EXISTS "Admins can delete artworks" ON public.artworks;
CREATE POLICY "Admins can delete artworks"
  ON public.artworks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
        AND p.account_status = 'active'
        AND p.is_demo = false
    )
  );

DROP POLICY IF EXISTS "Admins delete artwork images" ON storage.objects;
CREATE POLICY "Admins delete artwork images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artwork-images'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
        AND p.account_status = 'active'
        AND p.is_demo = false
    )
  );
