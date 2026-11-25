-- 287: profiles_public exposes vat_verified_at for suppliers (the «يُصدر فاتورة ضريبية» badge; a date only, set by the admin).
create or replace view public.profiles_public as
SELECT id,
    role,
        CASE
            WHEN role <> 'contractor'::user_role THEN company_name_ar
            ELSE NULL::text
        END AS company_name_ar,
        CASE
            WHEN role <> 'contractor'::user_role THEN company_name_en
            ELSE NULL::text
        END AS company_name_en,
    supplier_tier,
    contractor_grade,
    rating_avg,
    rating_count,
    city,
    region,
        CASE
            WHEN COALESCE(provider_type, ''::text) = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::text
            ELSE district
        END AS district,
    verification_status,
    cr_verification_source,
    preferred_language,
    is_active,
    subscription_plan,
    created_at,
    approvals,
        CASE
            WHEN role = 'supplier'::user_role THEN
            CASE
                WHEN provider_type = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::numeric
                ELSE latitude
            END
            ELSE NULL::numeric
        END AS latitude,
        CASE
            WHEN role = 'supplier'::user_role THEN
            CASE
                WHEN provider_type = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::numeric
                ELSE longitude
            END
            ELSE NULL::numeric
        END AS longitude,
        CASE
            WHEN role = 'supplier'::user_role AND (COALESCE(provider_type, ''::text) <> ALL (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text])) THEN national_short_address
            ELSE NULL::text
        END AS national_short_address,
        CASE
            WHEN role = 'supplier'::user_role THEN vat_verified_at
            ELSE NULL::timestamp with time zone
        END AS vat_verified_at
   FROM profiles;
