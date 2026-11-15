DROP POLICY IF EXISTS "exhibitions_all_admin" ON public.exhibitions;

CREATE POLICY "exhibitions_manage_admin_and_curator"
  ON public.exhibitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.account_status = 'active'
        AND profile.is_demo = false
        AND (
          profile.role = 'admin'
          OR (
            profile.role = 'artist'
            AND curator_id = auth.uid()::text
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()::text
        AND profile.account_status = 'active'
        AND profile.is_demo = false
        AND (
          profile.role = 'admin'
          OR (
            profile.role = 'artist'
            AND curator_id = auth.uid()::text
          )
        )
    )
  );
