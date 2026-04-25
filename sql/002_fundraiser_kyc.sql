-- Immutable fundraiser KYC records.

CREATE TABLE IF NOT EXISTS public.fundraiser_kyc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  country TEXT NOT NULL,
  id_number TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundraiser_kyc_user ON public.fundraiser_kyc(user_id);

CREATE OR REPLACE FUNCTION public.prevent_fundraiser_kyc_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'KYC records are immutable and cannot be changed after submission';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fundraiser_kyc_immutable_update ON public.fundraiser_kyc;
CREATE TRIGGER fundraiser_kyc_immutable_update
  BEFORE UPDATE ON public.fundraiser_kyc
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fundraiser_kyc_update();