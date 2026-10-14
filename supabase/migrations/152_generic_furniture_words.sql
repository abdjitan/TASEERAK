-- 152: generic furniture (2026-10-14) — «طاولة/كرسي/خزانة حسب الطلب (أي نوع)»: the buyer picks the type
-- (or writes it) and can attach a photo. Plain words now lead to the generic item first.
insert into learned_synonyms (term_norm, product_name, sector, users, status, source) values
 ('طاوله', 'طاولة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('طاولات', 'طاولة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('ترابيزه', 'طاولة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('table', 'طاولة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('كرسي', 'كرسي حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('كراسي', 'كرسي حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('chair', 'كرسي حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('خزانه', 'خزانة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed'),
 ('cabinet', 'خزانة حسب الطلب (أي نوع)', 'architectural', 0, 'approved', 'seed')
on conflict (term_norm, product_name) do nothing;
