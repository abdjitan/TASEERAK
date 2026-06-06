-- =============================================
-- 007 — FIX: rating trigger must run with definer rights
--
-- BUG found in review: inserting a review fires update_supplier_rating(),
-- which UPDATEs the *supplier's* profile (rating_avg / rating_count).
-- That function was NOT security-definer, so it ran as the reviewer
-- (the contractor). RLS "Users update own profile" blocks a contractor
-- from updating a supplier's profile → the trigger errored → the whole
-- review insert ROLLED BACK → submitting a rating failed.
--
-- FIX: recreate the function as SECURITY DEFINER so the aggregation
-- update bypasses RLS (it only touches rating columns).
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- =============================================

create or replace function update_supplier_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set
    rating_avg   = (select avg(rating)  from reviews where reviewed_id = NEW.reviewed_id),
    rating_count = (select count(*)      from reviews where reviewed_id = NEW.reviewed_id)
  where id = NEW.reviewed_id;
  return NEW;
end;
$$;

-- the existing trigger on_review_insert already calls this function,
-- so recreating the function is enough.
