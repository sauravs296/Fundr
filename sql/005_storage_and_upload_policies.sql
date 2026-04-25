-- Storage + upload support for KYC and campaign media
-- Run this migration in Supabase SQL editor

-- 1) Extend campaigns with optional proof metadata
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS official_link TEXT,
ADD COLUMN IF NOT EXISTS proof_document_url TEXT;

-- 2) Keep KYC one-time immutable, but allow status updates by admins/review flow
CREATE OR REPLACE FUNCTION public.prevent_fundraiser_kyc_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
    OR NEW.country IS DISTINCT FROM OLD.country
    OR NEW.id_number IS DISTINCT FROM OLD.id_number
    OR NEW.document_url IS DISTINCT FROM OLD.document_url
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
  THEN
    RAISE EXCEPTION 'KYC identity fields are immutable and cannot be changed after submission';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'kyc-documents',
    'kyc-documents',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  ),
  (
    'campaign-media',
    'campaign-media',
    true,
    4194304,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  ),
  (
    'campaign-proofs',
    'campaign-proofs',
    false,
    6291456,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4) Storage policies (idempotent)
DROP POLICY IF EXISTS "kyc_upload_own" ON storage.objects;
CREATE POLICY "kyc_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "kyc_read_owner_or_admin" ON storage.objects;
CREATE POLICY "kyc_read_owner_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "kyc_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "kyc_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_media_upload_own" ON storage.objects;
CREATE POLICY "campaign_media_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "campaign_media_read_public" ON storage.objects;
CREATE POLICY "campaign_media_read_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "campaign_media_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_media_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_proofs_upload_own" ON storage.objects;
CREATE POLICY "campaign_proofs_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "campaign_proofs_read_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_proofs_read_owner_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_proofs_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_proofs_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);
