-- رقم مرجعي تسلسلي قصير لكل طلب تسعير: RFQ-1001 ...
create sequence if not exists public.rfq_ref_seq start 1001;
alter table public.rfqs add column if not exists ref_no bigint;

-- تعبئة الطلبات الحالية بالترتيب الزمني
do $$
declare r record;
begin
  for r in (select id from public.rfqs where ref_no is null order by created_at) loop
    update public.rfqs set ref_no = nextval('public.rfq_ref_seq') where id = r.id;
  end loop;
end $$;

-- الطلبات الجديدة تأخذ رقماً تلقائياً
alter table public.rfqs alter column ref_no set default nextval('public.rfq_ref_seq');
grant usage, select on sequence public.rfq_ref_seq to authenticated, anon;
