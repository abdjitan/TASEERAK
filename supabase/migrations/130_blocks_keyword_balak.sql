-- 130: "بلك" (how the market says block) did not route to the blocks specialty, so a quick
-- request for "بلك" reached every civil supplier instead of block sellers. Same change in the TS
-- fallback (src/types/index.ts).
update public.taxonomy
   set keywords = (select array_agg(distinct k) from unnest(keywords || array['بلك','بلكة','بلوكات']) k)
 where sector = 'civil' and sub_key = 'blocks';
