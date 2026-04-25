-- Fundr schema (no RLS policies yet by request)
-- Execute in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  twitter_url TEXT,
  github_url TEXT,
  website_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  total_raised_xlm NUMERIC DEFAULT 0,
  total_backed_xlm NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_address TEXT UNIQUE NOT NULL,
  factory_tx_hash TEXT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'technology' CHECK (
    category IN ('technology', 'art', 'education', 'environment', 'health', 'community')
  ),
  goal_xlm NUMERIC NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'successful', 'failed', 'withdrawn')
  ),
  is_featured BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);

CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign ON public.campaign_updates(campaign_id);

CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  backer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  amount_xlm NUMERIC NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('pending', 'confirmed', 'refunded')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON public.contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_wallet ON public.contributions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_contributions_backer ON public.contributions(backer_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_campaign ON public.comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'fraud', 'inappropriate', 'misleading', 'other')
  ),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'resolved', 'dismissed')
  ),
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT report_target CHECK (
    (campaign_id IS NOT NULL AND comment_id IS NULL) OR
    (campaign_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'campaign_funded',
      'campaign_goal_met',
      'campaign_failed',
      'campaign_update',
      'refund_available',
      'withdrawal_available',
      'comment_reply',
      'campaign_flagged'
    )
  ),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.generate_campaign_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND length(trim(NEW.slug)) > 0 THEN
    RETURN NEW;
  END IF;

  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\\s+', '-', 'g');
  base_slug := substring(base_slug FROM 1 FOR 60);
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_generate_slug ON public.campaigns;
CREATE TRIGGER campaigns_generate_slug
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.generate_campaign_slug();

CREATE OR REPLACE FUNCTION public.update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET total_raised_xlm = total_raised_xlm + NEW.amount_xlm
  FROM public.campaigns
  WHERE campaigns.id = NEW.campaign_id
    AND profiles.id = campaigns.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contribution_confirmed ON public.contributions;
CREATE TRIGGER on_contribution_confirmed
  AFTER INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_stats();
