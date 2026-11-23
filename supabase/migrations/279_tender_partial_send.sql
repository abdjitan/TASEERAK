-- 279 (round-5 UX-021/UX-158): a tender sent in parts stays open; each sent item remembers its request,
-- and the tender links to the request it produced.
alter table public.tender_items add column if not exists sent_rfq_id uuid references public.rfqs(id) on delete set null;
create index if not exists tender_items_unsent_idx on public.tender_items (tender_id) where sent_rfq_id is null;
alter table public.tenders add column if not exists rfq_id uuid references public.rfqs(id) on delete set null;

create or replace function public.tenders_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.contractor_id <> old.contractor_id then
    raise exception 'tender_owner_immutable';
  end if;
  if new.project_rfq_id is not null and (tg_op = 'INSERT' or new.project_rfq_id is distinct from old.project_rfq_id) then
    if not exists (select 1 from project_rfqs p where p.id = new.project_rfq_id and p.contractor_id = new.contractor_id) then
      raise exception 'tender_project_not_owned';
    end if;
  end if;
  if new.rfq_id is not null and (tg_op = 'INSERT' or new.rfq_id is distinct from old.rfq_id) then
    if not exists (select 1 from rfqs r where r.id = new.rfq_id and r.contractor_id = new.contractor_id) then
      raise exception 'tender_rfq_not_owned';
    end if;
  end if;
  return new;
end $$;

-- a sent item can only point to a request of the tender's owner
create or replace function public.tender_items_sent_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sent_rfq_id is not null and (tg_op = 'INSERT' or new.sent_rfq_id is distinct from old.sent_rfq_id) then
    if not exists (select 1 from tenders t join rfqs r on r.id = new.sent_rfq_id and r.contractor_id = t.contractor_id
                   where t.id = new.tender_id) then
      raise exception 'tender_item_rfq_not_owned';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tender_items_sent_guard on public.tender_items;
create trigger tender_items_sent_guard before insert or update of sent_rfq_id on public.tender_items
  for each row execute function public.tender_items_sent_guard();
