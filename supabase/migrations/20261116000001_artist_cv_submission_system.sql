CREATE TABLE IF NOT EXISTS public.artist_cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  biography text NOT NULL DEFAULT '',
  artistic_statement text NOT NULL DEFAULT '',
  education text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  exhibitions text NOT NULL DEFAULT '',
  awards text NOT NULL DEFAULT '',
  specialisation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  admin_feedback text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id)
);

CREATE TABLE IF NOT EXISTS public.artist_cv_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_cv_id uuid NOT NULL REFERENCES public.artist_cvs(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_cvs_artist_id_idx ON public.artist_cvs (artist_id);
CREATE INDEX IF NOT EXISTS artist_cvs_status_idx ON public.artist_cvs (status);
CREATE INDEX IF NOT EXISTS artist_cvs_submitted_at_idx ON public.artist_cvs (submitted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS artist_cv_reviews_artist_cv_id_idx ON public.artist_cv_reviews (artist_cv_id);
CREATE INDEX IF NOT EXISTS artist_cv_reviews_reviewed_at_idx ON public.artist_cv_reviews (reviewed_at DESC);

ALTER TABLE public.artist_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_cv_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can read their own CVs"
  ON public.artist_cvs FOR SELECT
  USING (auth.uid() = artist_id);

CREATE POLICY "Artists can insert their own draft CV"
  ON public.artist_cvs FOR INSERT
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can update their own draft or rejected CV"
  ON public.artist_cvs FOR UPDATE
  USING (auth.uid() = artist_id AND status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = artist_id AND status IN ('draft', 'pending', 'rejected'));

CREATE POLICY "Artists cannot modify submitted or approved CVs"
  ON public.artist_cvs FOR UPDATE
  USING (auth.uid() = artist_id AND status IN ('pending', 'approved'))
  WITH CHECK (FALSE);

CREATE POLICY "Admins can manage all CVs"
  ON public.artist_cvs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Public can read only approved CVs"
  ON public.artist_cvs FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Artists can read their own review history"
  ON public.artist_cv_reviews FOR SELECT
  USING (auth.uid() = artist_id OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Admins can create review records"
  ON public.artist_cv_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update review records"
  ON public.artist_cv_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.set_artist_cv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artist_cvs_set_updated_at
BEFORE UPDATE ON public.artist_cvs
FOR EACH ROW
EXECUTE FUNCTION public.set_artist_cv_updated_at();
