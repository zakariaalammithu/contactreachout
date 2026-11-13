-- Sender postal address (2026-11-13): the profile holds the sender's
-- street address, city, state/region and postal code so target contact
-- forms that ask for an address can be filled from the account identity,
-- like company/website/job title/country before them. All four are
-- optional: campaigns must start and send fine with them empty, and a
-- missing value is never fabricated — the field stays blank and the
-- mapping gate holds the lead for review.
ALTER TABLE IF EXISTS public.app_users
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state_region TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;
