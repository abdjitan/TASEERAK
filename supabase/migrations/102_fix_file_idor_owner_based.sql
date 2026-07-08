-- =====================================================================================
-- 102_fix_file_idor_owner_based.sql   (SUPERSEDES the can_access_shared_file in 100_)
-- Round-4 adversarial re-review found the round-2 IDOR fix was STILL bypassable: the
-- function matched the requested path as TEXT inside attacker-authored fields (his own
-- offer.item_prices/attachment_url), so an attacker who put a VICTIM's path into HIS OWN
-- offer passed the check. FIX: derive the file OWNER from the storage path prefix, and scope
-- every text-match to records AUTHORED BY THE OWNER (offers.supplier_id = owner /
-- rfqs.contractor_id = owner) — which an attacker cannot forge (offers INSERT requires
-- supplier_id = auth.uid(); nobody can create an RFQ as another contractor).
-- Adversarially verified: owner ✓, legit counterparty ✓, attacker-injects-own-offer ✗,
-- unrelated user ✗.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.can_access_shared_file(p_path text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_owner uuid; v_served text[];
begin
  if v_uid is null then return false; end if;
  if length(coalesce(p_path,'')) < 20 then return false; end if;
  if p_path like '%..%' then return false; end if;
  if public.is_admin() then return true; end if;

  -- OWNER is taken from the storage key prefix only ("{uid}/..." or "material-requests/{uid}/...").
  begin
    if p_path like 'material-requests/%' then
      v_owner := split_part(p_path, '/', 2)::uuid;
    else
      v_owner := split_part(p_path, '/', 1)::uuid;
    end if;
  exception when others then return false; end;
  if v_owner is null then return false; end if;

  if v_owner = v_uid then return true; end if; -- the caller owns the file

  -- Offer attachment / per-item catalog: owned by a SUPPLIER (v_owner) → visible to the CONTRACTOR
  -- of an RFQ that supplier actually bid on. Text-match restricted to offers authored by v_owner.
  if exists (
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where o.supplier_id = v_owner and r.contractor_id = v_uid
      and (position(p_path in coalesce(o.attachment_url,'')) > 0
        or position(p_path in coalesce(o.item_prices::text,'')) > 0)
  ) then return true; end if;

  -- RFQ spec file / BOQ: owned by a CONTRACTOR (v_owner) → visible to a supplier who bid on, or is
  -- region-eligible for, that specific RFQ. Text-match restricted to rfqs authored by v_owner.
  v_served := public.served_regions(v_uid);
  if exists (
    select 1 from rfqs r
    where r.contractor_id = v_owner
      and (position(p_path in coalesce(r.items::text,'')) > 0
        or position(p_path in coalesce(r.notes,'')) > 0)
      and (
        exists (select 1 from offers o2 where o2.rfq_id = r.id and o2.supplier_id = v_uid)
        or (
          (coalesce(r.nearby_only,false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
          and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
        )
      )
  ) then return true; end if;

  return false; -- project BOQ/spec are contractor-only → covered by v_owner = v_uid above
end; $function$;

-- Lock uploads/updates in the shared bucket to the caller's own folder (was: any authenticated
-- could write any path). Service-role server routes bypass RLS and set the path from the verified
-- user, so they are unaffected.
DROP POLICY IF EXISTS "licenses insert" ON storage.objects;
CREATE POLICY "licenses insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'licenses' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR ((storage.foldername(name))[1] = 'material-requests' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );
DROP POLICY IF EXISTS "licenses update" ON storage.objects;
CREATE POLICY "licenses update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'licenses' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'licenses' AND owner = auth.uid());
