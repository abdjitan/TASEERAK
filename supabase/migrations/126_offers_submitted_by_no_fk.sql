-- 126: offers.submitted_by must NOT be a second FK to profiles. With two FKs, PostgREST embeds
-- like offers?select=*,supplier:profiles_public(...) became ambiguous (PGRST201, HTTP 300) and
-- buyers saw no offers. The column stays (who on a company team sent the offer), without the FK.
alter table public.offers drop constraint if exists offers_submitted_by_fkey;
notify pgrst, 'reload schema';
