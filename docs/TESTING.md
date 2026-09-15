# Testing the backend

## On every change

```sh
npm test         # 10 engine tests, 12 card art checks, cards migration drift
npm run build    # must be clean
```

## Two members, two browsers

The manual pass for the signed-in app. Use two separate browsers, or one normal
and one private window, so the sessions do not share storage.

Sign-up sends a confirmation email (confirmations are on for this project), so
use two inboxes you can read. The automated run below created its two accounts
directly in `auth.users` instead, so that no email went to an address nobody
owns, and removed them afterwards.

| # | Where | Do | Expect |
|---|---|---|---|
| 1 | Browser 1 | Create an account, confirm it, sign in | Onboarding, with the same three fields as before |
| 2 | Browser 1 | Onboard as Ada, 31 May 1961, love | The card turns; See your matches |
| 3 | Browser 2 | The same as Ben, 25 January 1971, love | The card turns; See your matches |
| 4 | Both | Reload browser 1, look at Matches | Each sees the other in the feed |
| 5 | Browser 1 | About you → Add a photo, give it a caption | The photo, marked primary, with its caption |
| 6 | Browser 2 | Open Ada | Her photo and caption in a strip under her bowtie |
| 7 | Both | Switch the pill to "after connecting"; open the other; Connect to read the cards | The reading opens: "A natural fit" for this pair |
| 8 | Browser 1 | Say hello; send a message | The message in the thread |
| 9 | Browser 2 | Messages tab, without reloading | Ada's message arrives on its own; open it and reply |
| 10 | Browser 1 | Stay in the thread, without reloading | Ben's reply arrives on its own |
| 11 | Browser 2 | Open Ada → Block Ada → Block Ada | Back on Matches, Ada gone from the feed |
| 12 | Browser 1 | Still in the thread, send again | "That did not send. Try again." |
| 13 | Browser 1 | Reload | Ben gone from Matches; Messages has no conversations |

And the parts of photos and bowties the pass above does not reach:

| # | Do | Expect |
|---|---|---|
| 14 | Edit your bowtie → Image → choose a picture → Save | The face comes back from Storage as a 256px square |
| 15 | Add a second photo; Later on the first; Make primary on the new first | The order swaps; exactly one photo is primary |
| 16 | Delete → Delete for good on one photo; switch the bowtie back to an emoji | The photo goes; the old bowtie image is deleted too |
| 17 | Run the orphan query below | Both counts are 0 |

```sql
select
  (select count(*) from public.profile_photos p
    where not exists (select 1 from storage.objects o
      where o.bucket_id = 'profile-photos' and o.name = p.storage_path)) as rows_without_a_file,
  (select count(*) from storage.objects o
    where o.bucket_id = 'profile-photos'
      and not exists (select 1 from public.profile_photos p where p.storage_path = o.name)
      and not exists (select 1 from public.profiles pr where pr.bowtie_image_path = o.name)) as files_without_a_row;
```

Demo mode (`VITE_DEMO_MODE=true`) has its own short pass: no sign-in screen,
the 35 seeded profiles in Matches, no photos and no block or report, and a first
message to anyone gets one reply.

### Result, 15 September 2026

Every step passed, driven in headless Chrome with two isolated browser contexts
against project `ofmlahcfcuhwykgzupey` and the Vite dev server. From the run log:

```
[17:22:02] A: signed in as ks-e2e-a@kindred-spirits.test, onboarding shown
[17:22:04] A: onboarded as Ada Test (1961-05-31), in Matches
[17:22:06] B: signed in as ks-e2e-b@kindred-spirits.test, onboarding shown
[17:22:09] B: onboarded as Ben Test (1971-01-25), in Matches
[17:22:09] A and B each see the other in Matches
[17:22:13] A: uploaded a photo and captioned it
[17:22:15] B: sees Ada's photo on her profile, caption "At the coast, last spring"
[17:22:15] A and B connected both ways; the reading between them: "A natural fit"
[17:22:17] A: opened a conversation with Ben and sent a message
[17:22:18] B: Ada's message appeared in Messages without a reload (514 ms after opening the tab)
[17:22:18] A: Ben's reply appeared in the open thread without a reload (512 ms after he sent it)
[17:22:19] B: blocked Ada; she is gone from his feed
[17:22:20] A: sending into the thread after the block fails with "That did not send. Try again."
[17:22:25] A: after a reload Ben is gone from her feed and the conversation is gone from Messages
[17:22:25] ALL STEPS PASSED

[17:26:13] B: signed in and went straight to Matches (already onboarded)
[17:26:15] B: bowtie face uploaded and served back from Storage: 9021c707-…/c2662f79-….png, 256x256
[17:26:21] B: added two photos: first (primary), second
[17:26:22] B: moved "first" later: second, first (primary)
[17:26:23] B: made "second" primary, and "first" lost it
[17:26:24] B: deleted "first": second (primary)
[17:26:24] B: switched the bowtie back to an emoji (🌙)
[17:26:24] ALL STEPS PASSED
```

Afterwards, in SQL: B's folder held exactly one file (the remaining photo, a
3,995 byte JPEG), `bowtie_image_path` was null, and both orphan counts were 0.

Demo mode: onboarding was the first screen with no sign-in form, Matches showed
35 people, the reading showed neither photos nor block and report, and the
first message got the seeded reply "Hello to you too. What brought you to the
reading?".

## RLS proof

`scripts/rls-proof.mjs` signs three real members in over the API with the
publishable key: an owner and a partner who are a mutual match with a
conversation and a photo, and an outsider. Then it attacks, as anon, as the
outsider and as the partner, and prints what the API said. It exits non-zero
if anything is allowed.

```sh
node --env-file=.env scripts/rls-proof.mjs path/to/accounts.json
```

Output from 15 September 2026:

```
API https://ofmlahcfcuhwykgzupey.supabase.co, publishable key, members signed in with their own passwords
owner 0d6fff5d-347e-4845-9b75-440feec62d24   partner 2d00b9aa-15be-4b73-b2c5-ddd44c95f808   outsider c707cfda-18a4-49b9-b886-fb0ea4a4474e
conversation 05dbc0fe-98c9-4bac-9f0b-98bbabb3408e between owner and partner; photo 0d6fff5d-347e-4845-9b75-440feec62d24/de590b0a-6a3c-4c9b-8fbc-389780c0c35a.png

refused  1. read conversations of the owner's conversation              as anon      42501 permission denied for table conversations
refused  1. read conversation_participants of the owner's conversation  as anon      42501 permission denied for table conversation_participants
refused  1. read messages of the owner's conversation                   as anon      42501 permission denied for table messages
refused  1. read conversations of the owner's conversation              as outsider  0 rows returned
refused  1. read conversation_participants of the owner's conversation  as outsider  0 rows returned
refused  1. read messages of the owner's conversation                   as outsider  0 rows returned
refused  1. open a conversation with the owner (no mutual match)        as outsider  42501 You can only start a conversation with a mutual match.
refused  2. send a message with the owner's sender_id                   as partner   42501 new row violates row-level security policy for table "messages"
refused  2. send a message with the owner's sender_id                   as outsider  42501 new row violates row-level security policy for table "messages"
refused  2. send a message with the owner's sender_id                   as anon      42501 permission denied for table messages
refused  2. check, as the owner: forged messages in the thread          as owner     0 found
refused  3. upload a new file into the owner's folder                   as anon      403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                 as anon      403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                    as anon      0 objects deleted
refused  3. upload a new file into the owner's folder                   as outsider  403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                 as outsider  403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                    as outsider  0 objects deleted
refused  3. upload a new file into the owner's folder                   as partner   403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                 as partner   403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                    as partner   0 objects deleted
refused  3. check, as the owner: folder unchanged                       as owner     1 files, identical to before

21 attempts, 21 refused, 0 allowed
```

The forged `sender_id` is refused even from the partner, who is a member of the
conversation: the insert policy checks `sender_id = auth.uid()`, not only
membership.

## Advisors

- **Security:** one warning, "Leaked password protection disabled". It is an
  Auth setting that Supabase offers only on the Pro plan, and this project's
  organization is on the free plan, so it cannot be switched on here. Nothing
  else.
- **Performance:** four "unused index" notices, on `blocks` and `reports`. Each
  index covers a foreign key; they are unused because those tables are nearly
  empty, and dropping them would raise the unindexed foreign key warning instead.
