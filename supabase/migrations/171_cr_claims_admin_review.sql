-- 171: admin verification through one RPC + the CR claim flow.
-- Design: docs/CR_VERIFICATION_DESIGN.md §2–3.
--
-- • admin_review_verification(): the admin page's verify/reject goes through here (audit +
--   notification; a CR conflict comes back as an error instead of being swallowed).
-- • cr_claims: someone whose CR is held by another account asks for it. The holder is told
--   (with the claimant's name, never the contact), may answer once, and the admin decides.
--   Nothing moves automatically.

-- New enum values must be committed before a function body can use them, so they are applied
-- as their own step first (live: 171_cr_claims_notification_types), then the rest of this file.
alter type public.notification_type add value if not exists 'cr_claim';
alter type public.notification_type add value if not exists 'verification_rejected';

-- ───────────────────────── admin review ─────────────────────────
create or replace function public.admin_review_verification(p_user_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('verified', 'rejected') then raise exception 'bad_decision'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  if p_decision = 'verified' then
    update public.profiles set verification_status = 'verified', rejection_reason = null,
           cr_verified_at = coalesce(cr_verified_at, now()),
           cr_verification_source = coalesce(cr_verification_source, 'admin')
     where id = p_user_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'account_verified', 'تم التحقق من حسابك', 'راجعت الإدارة مستنداتك ووثّقت حسابك.', jsonb_build_object('url', '/settings'));
  else
    update public.profiles set verification_status = 'rejected', rejection_reason = left(nullif(p_reason, ''), 1000)
     where id = p_user_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'verification_rejected', 'لم يُقبل طلب التوثيق',
            coalesce('السبب: ' || nullif(left(p_reason, 300), ''), 'راجع مستنداتك وأعد رفعها من الإعدادات.'),
            jsonb_build_object('url', '/settings'));
  end if;
  if not found then raise exception 'not_found'; end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'verification_' || p_decision, 'profile', p_user_id, jsonb_build_object('reason', p_reason));
end; $$;
revoke all on function public.admin_review_verification(uuid, text, text) from public, anon;
grant execute on function public.admin_review_verification(uuid, text, text) to authenticated;

-- ───────────────────────── claims ─────────────────────────
create table if not exists public.cr_claims (
  id uuid primary key default gen_random_uuid(),
  commercial_registration text not null,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  claimant_name text not null,
  claimant_contact text,
  file_path text not null,                 -- private 'verification' bucket, under the claimant's folder
  holder_id uuid references public.profiles(id) on delete set null,
  holder_response text,
  holder_responded_at timestamptz,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'withdrawn')),
  admin_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists cr_claims_one_open on public.cr_claims (commercial_registration, claimant_id) where status = 'open';
create index if not exists cr_claims_holder on public.cr_claims (holder_id) where status = 'open';
alter table public.cr_claims enable row level security;
drop policy if exists "cr_claims claimant or admin read" on public.cr_claims;
create policy "cr_claims claimant or admin read" on public.cr_claims for select
  using (claimant_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: every write goes through the RPCs below

create or replace function public.notify_admins_cr_claim(p_title text, p_body text, p_claim uuid)
returns void language sql security definer set search_path to 'public' as $$
  insert into public.notifications (user_id, type, title, body, data)
  select p.id, 'cr_claim', p_title, p_body, jsonb_build_object('url', '/admin?tab=claims', 'claim_id', p_claim)
    from public.profiles p where p.role = 'admin';
$$;
revoke all on function public.notify_admins_cr_claim(text, text, uuid) from public, anon, authenticated;

create or replace function public.submit_cr_claim(p_cr text, p_name text, p_contact text, p_file_path text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_cr text := public.normalize_cr(p_cr); v_holder uuid; v_id uuid; v_name text := left(btrim(coalesce(p_name, '')), 120);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_cr is null or length(v_cr) <> 10 then raise exception 'رقم السجل التجاري يجب أن يكون 10 أرقام.'; end if;
  if v_name = '' then raise exception 'اكتب اسمك أو اسم المنشأة.'; end if;
  if coalesce(p_file_path, '') = '' or position(v_uid::text || '/' in p_file_path) <> 1 or p_file_path like '%..%' then
    raise exception 'ارفع صورة السجل التجاري أولاً.';
  end if;
  if not public.check_rate_limit('cr_claim:' || v_uid::text, 3, 86400) then
    raise exception 'طلبات كثيرة اليوم. حاول غداً.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.cr_claims where commercial_registration = v_cr and created_at > now() - interval '1 day') >= 5 then
    raise exception 'وصل هذا السجل إلى حدّ الطلبات اليومي. حاول غداً.';
  end if;
  select id into v_holder from public.profiles
   where commercial_registration = v_cr and verification_status <> 'rejected' and id <> v_uid
   order by created_at limit 1;
  if v_holder is null then raise exception 'هذا السجل غير مستخدم في حساب آخر؛ أضِفه من الإعدادات مباشرة.'; end if;
  if exists (select 1 from public.cr_claims where commercial_registration = v_cr and claimant_id = v_uid and status = 'open') then
    raise exception 'لديك طلب مفتوح على هذا السجل.';
  end if;

  insert into public.cr_claims (commercial_registration, claimant_id, claimant_name, claimant_contact, file_path, holder_id)
  values (v_cr, v_uid, v_name, left(nullif(btrim(coalesce(p_contact, '')), ''), 200), p_file_path, v_holder)
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_holder, 'cr_claim', 'طلب تحقق على سجلك التجاري',
          format('تقدّم شخص بطلب على سجلك التجاري رقم %s باسم «%s»، للتحقق. يمكنك الرد قبل أن تقرر الإدارة.', v_cr, v_name),
          jsonb_build_object('url', '/verification/claims', 'claim_id', v_id));
  perform public.notify_admins_cr_claim('طلب على سجل تجاري', format('طلب على السجل %s باسم «%s».', v_cr, v_name), v_id);
  insert into public.audit_logs (actor_id, action, entity, entity_id, detail)
  values (v_uid, 'cr_claim_submit', 'cr_claim', v_id, jsonb_build_object('cr', v_cr, 'holder', v_holder));
  return v_id;
end; $$;
revoke all on function public.submit_cr_claim(text, text, text, text) from public, anon;
grant execute on function public.submit_cr_claim(text, text, text, text) to authenticated;

-- The holder's view: claims on his CR, without the claimant's contact or file.
create or replace function public.get_my_cr_claims()
returns table (id uuid, commercial_registration text, claimant_name text, status text, holder_response text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select c.id, c.commercial_registration, c.claimant_name, c.status, c.holder_response, c.created_at
    from public.cr_claims c where c.holder_id = auth.uid() order by c.created_at desc limit 50;
$$;
revoke all on function public.get_my_cr_claims() from public, anon;
grant execute on function public.get_my_cr_claims() to authenticated;

create or replace function public.respond_cr_claim(p_claim_id uuid, p_text text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_cr text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if btrim(coalesce(p_text, '')) = '' then raise exception 'اكتب ردّك.'; end if;
  update public.cr_claims set holder_response = left(btrim(p_text), 2000), holder_responded_at = now()
   where id = p_claim_id and holder_id = auth.uid() and status = 'open' and holder_response is null
  returning commercial_registration into v_cr;
  if v_cr is null then raise exception 'لا يمكن الرد على هذا الطلب.'; end if;
  perform public.notify_admins_cr_claim('ردّ صاحب السجل', format('ردّ صاحب السجل %s على الطلب.', v_cr), p_claim_id);
end; $$;
revoke all on function public.respond_cr_claim(uuid, text) from public, anon;
grant execute on function public.respond_cr_claim(uuid, text) to authenticated;

create or replace function public.withdraw_cr_claim(p_claim_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.cr_claims set status = 'withdrawn', resolved_at = now()
   where id = p_claim_id and claimant_id = auth.uid() and status = 'open';
  if not found then raise exception 'لا يمكن سحب هذا الطلب.'; end if;
end; $$;
revoke all on function public.withdraw_cr_claim(uuid) from public, anon;
grant execute on function public.withdraw_cr_claim(uuid) to authenticated;

-- Admin decision. Approve = the holder loses the CR (back to pending), the claimant gets it
-- (pending, with the claim file as his CR document) — the admin then verifies him normally.
create or replace function public.admin_resolve_cr_claim(p_claim_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare c public.cr_claims%rowtype;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'bad_decision'; end if;
  select * into c from public.cr_claims where id = p_claim_id and status = 'open' for update;
  if not found then raise exception 'الطلب غير موجود أو مغلق.'; end if;

  if p_decision = 'approved' then
    perform set_config('app.bypass_locks', 'on', true);
    if exists (select 1 from public.profiles where id = c.claimant_id and verification_status = 'verified'
                 and commercial_registration is not null and commercial_registration <> c.commercial_registration) then
      raise exception 'صاحب الطلب موثّق بسجل آخر؛ لا يمكن نقل هذا السجل إليه.';
    end if;
    update public.profiles set commercial_registration = null, verification_status = 'pending',
           cr_verified_at = null, cr_verification_source = null, cr_official_name = null, cr_status = null
     where commercial_registration = c.commercial_registration and id <> c.claimant_id;
    update public.profiles set commercial_registration = c.commercial_registration, verification_status = 'pending',
           cr_url = c.file_path
     where id = c.claimant_id;
    if c.holder_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (c.holder_id, 'cr_claim', 'نُقل السجل التجاري',
              format('قررت الإدارة بعد المراجعة أن السجل %s يخص صاحب الطلب، وأُزيل من حسابك. للاعتراض تواصل مع الإدارة.', c.commercial_registration),
              jsonb_build_object('url', '/settings'));
    end if;
    insert into public.notifications (user_id, type, title, body, data)
    values (c.claimant_id, 'cr_claim', 'قُبل طلبك على السجل التجاري',
            format('أُضيف السجل %s إلى حسابك، وسيُراجَع للتوثيق.', c.commercial_registration), jsonb_build_object('url', '/settings'));
  else
    insert into public.notifications (user_id, type, title, body, data)
    values (c.claimant_id, 'cr_claim', 'لم يُقبل طلبك على السجل التجاري',
            coalesce('ملاحظة الإدارة: ' || nullif(left(p_note, 300), ''), 'لم تثبت المستندات ملكية السجل.'), jsonb_build_object('url', '/settings'));
  end if;

  update public.cr_claims set status = p_decision, admin_note = left(nullif(p_note, ''), 2000),
         resolved_by = auth.uid(), resolved_at = now() where id = p_claim_id;
  insert into public.audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'cr_claim_' || p_decision, 'cr_claim', p_claim_id,
          jsonb_build_object('cr', c.commercial_registration, 'holder', c.holder_id, 'claimant', c.claimant_id));
end; $$;
revoke all on function public.admin_resolve_cr_claim(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_cr_claim(uuid, text, text) to authenticated;

-- Owner rule: a company seller is verified only with an uploaded CR document (independent
-- sellers have no CR). Applied live as 171_admin_review_requires_cr_doc.
create or replace function public.admin_review_verification(p_user_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_role text; v_kind text; v_cr_doc text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('verified', 'rejected') then raise exception 'bad_decision'; end if;
  select role::text, provider_type, cr_url into v_role, v_kind, v_cr_doc from public.profiles where id = p_user_id;
  if not found then raise exception 'not_found'; end if;
  if p_decision = 'verified' and v_role = 'supplier'
     and coalesce(v_kind, '') not in ('individual', 'broker', 'price_agent') and nullif(v_cr_doc, '') is null then
    raise exception 'لا يمكن توثيق منشأة دون رفع شهادة السجل التجاري.';
  end if;
  perform set_config('app.bypass_locks', 'on', true);
  if p_decision = 'verified' then
    update public.profiles set verification_status = 'verified', rejection_reason = null,
           cr_verified_at = coalesce(cr_verified_at, now()),
           cr_verification_source = coalesce(cr_verification_source, 'admin')
     where id = p_user_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'account_verified', 'تم التحقق من حسابك', 'راجعت الإدارة مستنداتك ووثّقت حسابك.', jsonb_build_object('url', '/settings'));
  else
    update public.profiles set verification_status = 'rejected', rejection_reason = left(nullif(p_reason, ''), 1000)
     where id = p_user_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'verification_rejected', 'لم يُقبل طلب التوثيق',
            coalesce('السبب: ' || nullif(left(p_reason, 300), ''), 'راجع مستنداتك وأعد رفعها من الإعدادات.'),
            jsonb_build_object('url', '/settings'));
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'verification_' || p_decision, 'profile', p_user_id, jsonb_build_object('reason', p_reason));
end; $$;
