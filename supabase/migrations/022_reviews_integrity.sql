-- Ratings integrity: a review must come from the contractor who actually had an
-- ACCEPTED offer with that supplier — no self-reviews, no competitor sabotage,
-- one review per deal. (Previously any signed-in user could review any supplier.)
drop policy if exists "Users manage own reviews" on public.reviews;

create policy "Insert review for own accepted deal" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewed_id
    and exists (
      select 1 from public.offers o
      join public.rfqs r on r.id = o.rfq_id
      where o.id = reviews.offer_id
        and o.supplier_id = reviews.reviewed_id
        and r.contractor_id = auth.uid()
        and o.status = 'accepted'
    )
  );

create policy "Update own review" on public.reviews
  for update using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid() and reviewer_id <> reviewed_id);

create policy "Delete own review" on public.reviews
  for delete using (reviewer_id = auth.uid());

create unique index if not exists reviews_one_per_offer
  on public.reviews (reviewer_id, offer_id) where offer_id is not null;
