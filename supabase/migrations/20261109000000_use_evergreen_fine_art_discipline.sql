ALTER TABLE public.profiles
  ALTER COLUMN discipline SET DEFAULT 'Fine Art';

UPDATE public.profiles
SET discipline = 'Fine Art'
WHERE discipline = 'Contemporary Fine Art';
