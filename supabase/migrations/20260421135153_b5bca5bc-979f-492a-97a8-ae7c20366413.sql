
DROP POLICY IF EXISTS "Authenticated can update alerts" ON public.alerts;
CREATE POLICY "Managers can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

-- Make chat-uploads bucket private (still readable by URL via signed/path access for owners)
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';
DROP POLICY IF EXISTS "Public read chat uploads" ON storage.objects;
CREATE POLICY "Auth read chat uploads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-uploads');
