-- ============================================================================
-- 063: نقل شجرة التخصصات (Taxonomy) إلى قاعدة البيانات — المرحلة 1 (المرآة)
--   جدول يعكس SUB_CATEGORIES الحالية ليصبح مصدراً قابلاً للتعديل من الأدمن
--   دون نشر جديد. التطبيق ما زال يستخدم نسخة الكود؛ المراحل التالية تبدّل القراءة.
-- ============================================================================
create table if not exists public.taxonomy (
  sector     text not null,
  sub_key    text not null,
  name_ar    text,
  name_en    text,
  name_ur    text,
  icon       text,
  grp        text,
  keywords   text[] default '{}',
  is_active  boolean default true,
  updated_at timestamptz default now(),
  primary key (sector, sub_key)
);
create index if not exists idx_taxonomy_sector on public.taxonomy(sector);

alter table public.taxonomy enable row level security;

-- بيانات مرجعية غير حساسة → قراءة لكل مستخدم مسجّل
drop policy if exists taxonomy_read on public.taxonomy;
create policy taxonomy_read on public.taxonomy for select to authenticated using (true);

-- التعديل للأدمن فقط (إضافة/تعديل كلمات مفتاحية وتخصصات بدون نشر)
drop policy if exists taxonomy_admin_write on public.taxonomy;
create policy taxonomy_admin_write on public.taxonomy
  for all to authenticated using (is_admin()) with check (is_admin());

-- لمسة updated_at عند التعديل
create or replace function public.taxonomy_touch()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_taxonomy_touch on public.taxonomy;
create trigger trg_taxonomy_touch before update on public.taxonomy
  for each row execute function public.taxonomy_touch();

-- دالة قراءة كاملة (للتطبيق/الأدمن لاحقاً)
create or replace function public.get_taxonomy()
returns setof public.taxonomy
language sql stable security definer set search_path to 'public'
as $$ select * from public.taxonomy where is_active order by sector, grp, sub_key $$;
revoke execute on function public.get_taxonomy() from public, anon;
grant  execute on function public.get_taxonomy() to authenticated;
