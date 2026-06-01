-- =============================================
-- BUILDORA PLATFORM — SUPABASE SCHEMA
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================
create type user_role as enum ('contractor', 'supplier', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type subscription_plan as enum ('free', 'professional');
create type sector as enum ('civil', 'architectural', 'electrical', 'mechanical');
create type rfq_status as enum ('open', 'closed', 'expired', 'cancelled');
create type offer_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type message_type as enum ('text', 'offer', 'file', 'system');
create type notification_type as enum ('rfq_offer', 'offer_accepted', 'offer_rejected', 'new_message', 'rfq_expiring', 'account_verified', 'subscription');

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role user_role not null,
  company_name_ar text not null,
  company_name_en text,
  commercial_registration text unique,
  vat_number text,
  phone text not null,
  city text,
  region text,
  verification_status verification_status default 'pending',
  subscription_plan subscription_plan default 'free',
  subscription_expires_at timestamptz,
  license_url text,
  cr_url text,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- SECTORS (many-to-many: profiles <-> sectors)
-- =============================================
create table profile_sectors (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  sector sector not null,
  unique(profile_id, sector)
);

-- =============================================
-- PRODUCTS (suppliers upload their products)
-- =============================================
create table products (
  id uuid default uuid_generate_v4() primary key,
  supplier_id uuid references profiles(id) on delete cascade,
  name text not null,
  sector sector not null,
  unit text not null,
  base_price numeric(12,2),
  specifications text[],   -- e.g. ['16mm','12mm','10mm']
  description text,
  delivery_available boolean default true,
  vat_invoice boolean default true,
  deferred_payment boolean default false,
  warranty boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- RFQs (Request for Quotation)
-- =============================================
create table rfqs (
  id uuid default uuid_generate_v4() primary key,
  contractor_id uuid references profiles(id) on delete cascade,
  sector sector not null,
  product_name text not null,
  specification text,
  quantity numeric(12,2) not null,
  unit text not null,
  region text not null,
  city text,
  delivery_required boolean default true,
  vat_invoice_required boolean default true,
  hide_identity boolean default false,
  notes text,
  status rfq_status default 'open',
  expires_at timestamptz not null,
  offer_count int default 0,
  created_at timestamptz default now()
);

-- =============================================
-- OFFERS (suppliers respond to RFQs)
-- =============================================
create table offers (
  id uuid default uuid_generate_v4() primary key,
  rfq_id uuid references rfqs(id) on delete cascade,
  supplier_id uuid references profiles(id) on delete cascade,
  total_price numeric(12,2) not null,
  unit_price numeric(12,2),
  delivery_days int,
  notes text,
  status offer_status default 'pending',
  po_number text,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique(rfq_id, supplier_id)
);

-- =============================================
-- CONVERSATIONS & MESSAGES
-- =============================================
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  contractor_id uuid references profiles(id) on delete cascade,
  supplier_id uuid references profiles(id) on delete cascade,
  rfq_id uuid references rfqs(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  contractor_unread int default 0,
  supplier_unread int default 0,
  created_at timestamptz default now(),
  unique(contractor_id, supplier_id)
);

create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  type message_type default 'text',
  content text,
  offer_id uuid references offers(id) on delete set null,
  file_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- REVIEWS
-- =============================================
create table reviews (
  id uuid default uuid_generate_v4() primary key,
  reviewer_id uuid references profiles(id) on delete cascade,
  reviewed_id uuid references profiles(id) on delete cascade,
  offer_id uuid references offers(id) on delete set null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(reviewer_id, offer_id)
);

-- =============================================
-- LICENSE VERIFICATION LOG (admin)
-- =============================================
create table license_reviews (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  admin_id uuid references profiles(id) on delete set null,
  action verification_status not null,
  reason text,
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES (performance)
-- =============================================
create index on rfqs(contractor_id);
create index on rfqs(sector);
create index on rfqs(region);
create index on rfqs(status);
create index on rfqs(expires_at);
create index on offers(rfq_id);
create index on offers(supplier_id);
create index on offers(status);
create index on messages(conversation_id);
create index on messages(sender_id);
create index on notifications(user_id);
create index on notifications(is_read);
create index on products(supplier_id);
create index on products(sector);
create index on profile_sectors(profile_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table rfqs enable row level security;
alter table offers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table reviews enable row level security;

-- Profiles: users see own profile, verified suppliers visible to all
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Verified suppliers are public"
  on profiles for select using (
    role = 'supplier' and verification_status = 'verified'
  );

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- RFQs: contractors manage own, suppliers see open ones in their sectors
create policy "Contractors manage own RFQs"
  on rfqs for all using (auth.uid() = contractor_id);

create policy "Suppliers view open RFQs"
  on rfqs for select using (
    status = 'open'
    and exists (
      select 1 from profile_sectors ps
      where ps.profile_id = auth.uid()
        and ps.sector = rfqs.sector
    )
  );

-- Offers: suppliers manage own, contractors see offers on their RFQs
create policy "Suppliers manage own offers"
  on offers for all using (auth.uid() = supplier_id);

create policy "Contractors view offers on their RFQs"
  on offers for select using (
    exists (
      select 1 from rfqs r
      where r.id = offers.rfq_id
        and r.contractor_id = auth.uid()
    )
  );

-- Messages: only conversation participants
create policy "Conversation participants access messages"
  on messages for all using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.contractor_id = auth.uid() or c.supplier_id = auth.uid())
    )
  );

-- Notifications: own only
create policy "Users see own notifications"
  on notifications for all using (auth.uid() = user_id);

-- Products: suppliers manage own, everyone reads active
create policy "Suppliers manage own products"
  on products for all using (auth.uid() = supplier_id);

create policy "Everyone reads active products"
  on products for select using (is_active = true);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update offer_count on rfqs
create or replace function update_rfq_offer_count()
returns trigger language plpgsql as $$
begin
  update rfqs set offer_count = (
    select count(*) from offers where rfq_id = NEW.rfq_id
  ) where id = NEW.rfq_id;
  return NEW;
end;
$$;

create trigger on_offer_insert
  after insert on offers
  for each row execute function update_rfq_offer_count();

-- Auto-update supplier rating
create or replace function update_supplier_rating()
returns trigger language plpgsql as $$
begin
  update profiles set
    rating_avg = (select avg(rating) from reviews where reviewed_id = NEW.reviewed_id),
    rating_count = (select count(*) from reviews where reviewed_id = NEW.reviewed_id)
  where id = NEW.reviewed_id;
  return NEW;
end;
$$;

create trigger on_review_insert
  after insert or update on reviews
  for each row execute function update_supplier_rating();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

-- Create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, role, company_name_ar, phone)
  values (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    coalesce(NEW.raw_user_meta_data->>'company_name_ar', 'شركة جديدة'),
    coalesce(NEW.raw_user_meta_data->>'phone', '')
  );
  return NEW;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- SUBCONTRACTOR & CLASSIFICATION ADDITIONS
-- =============================================

create type contractor_grade as enum ('A', 'B', 'C', 'D');

create type subcontractor_specialty as enum (
  'painting', 'tiling', 'electrical', 'plumbing',
  'hvac', 'gypsum', 'fire_safety', 'security',
  'steel_concrete', 'insulation', 'aluminum', 'landscaping'
);

-- Add grade + specialty columns to profiles
alter table profiles
  add column if not exists contractor_grade contractor_grade,
  add column if not exists grade_certificate_url text,
  add column if not exists grade_expires_at timestamptz,
  add column if not exists is_subcontractor boolean default false,
  add column if not exists years_experience int default 0,
  add column if not exists max_project_value numeric(14,2);

-- Subcontractor specialties (many per contractor)
create table if not exists contractor_specialties (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  specialty subcontractor_specialty not null,
  unique(profile_id, specialty)
);

-- Subcontractor requests (contractor looking for subcontractor)
create type sub_request_status as enum ('open','closed','expired','cancelled');

create table if not exists subcontractor_requests (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references profiles(id) on delete cascade,
  specialty subcontractor_specialty not null,
  min_grade contractor_grade,
  region text not null,
  city text,
  project_value numeric(14,2),
  start_date date,
  duration_months int,
  description text,
  requires_permit boolean default true,
  requires_warranty boolean default false,
  status sub_request_status default 'open',
  expires_at timestamptz not null,
  offer_count int default 0,
  created_at timestamptz default now()
);

-- Subcontractor offers on requests
create type sub_offer_status as enum ('pending','accepted','rejected');

create table if not exists subcontractor_offers (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references subcontractor_requests(id) on delete cascade,
  supplier_id uuid references profiles(id) on delete cascade,
  proposed_value numeric(14,2),
  proposed_duration_months int,
  notes text,
  status sub_offer_status default 'pending',
  created_at timestamptz default now(),
  unique(request_id, supplier_id)
);

-- Indexes
create index if not exists on contractor_specialties(profile_id);
create index if not exists on subcontractor_requests(requester_id);
create index if not exists on subcontractor_requests(specialty);
create index if not exists on subcontractor_requests(region);
create index if not exists on subcontractor_requests(status);
create index if not exists on subcontractor_offers(request_id);

-- RLS
alter table contractor_specialties enable row level security;
alter table subcontractor_requests enable row level security;
alter table subcontractor_offers enable row level security;

create policy "Contractors manage own specialties"
  on contractor_specialties for all using (auth.uid() = profile_id);

create policy "Everyone reads specialties"
  on contractor_specialties for select using (true);

create policy "Contractors manage own sub requests"
  on subcontractor_requests for all using (auth.uid() = requester_id);

create policy "Verified contractors view open requests"
  on subcontractor_requests for select using (
    status = 'open'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.verification_status = 'verified'
        and (p.role = 'contractor' or p.is_subcontractor = true)
    )
  );

create policy "Subcontractors manage own offers"
  on subcontractor_offers for all using (auth.uid() = supplier_id);

create policy "Requesters view offers on their requests"
  on subcontractor_offers for select using (
    exists (
      select 1 from subcontractor_requests r
      where r.id = subcontractor_offers.request_id
        and r.requester_id = auth.uid()
    )
  );
