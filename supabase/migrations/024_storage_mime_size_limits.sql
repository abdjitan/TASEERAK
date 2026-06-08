-- Server-enforced upload safety: restrict both storage buckets to a safe
-- document/image whitelist + a 15 MB size cap. Supabase rejects any other
-- content-type or oversize file at upload time — blocks executables, scripts,
-- html, svg, etc. (Client-side magic-byte validation adds defense in depth.)
update storage.buckets
set file_size_limit = 15728640,  -- 15 MB
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg','image/png','image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- xlsx
      'application/vnd.ms-excel',                                          -- xls
      'application/msword',                                                -- doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' -- docx
    ]
where id in ('licenses','verification');
