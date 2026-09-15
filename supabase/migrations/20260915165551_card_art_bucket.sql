-- Card art: a public bucket of card faces and the back.
--
-- Public because the art is a public-domain deck, not confidential, and the
-- demo build has no accounts: faces load from a plain, cacheable URL. There are
-- no client policies on it, so nobody can list, upload, replace or delete
-- through the API without the service role; scripts/upload-card-art.mjs fills
-- it. Paths carry a version prefix (v1/AS.svg), so new art is a new prefix and
-- never an overwrite.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-art', 'card-art', true, 2097152, array['image/svg+xml']);
