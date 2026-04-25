-- Ensure slug generation for campaigns
-- Run this migration in Supabase SQL editor

-- Create a function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION public.generate_campaign_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g'
    )
  ) || '-' || to_char(NOW(), 'YYYYMMDDHHmmss');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger to auto-generate slugs on insert
CREATE OR REPLACE FUNCTION public.set_campaign_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_campaign_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_slug_trigger ON public.campaigns;
CREATE TRIGGER campaigns_slug_trigger
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_slug();
