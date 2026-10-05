# Testing the backend

## On every change

```sh
npm test         # 22 checks: the engine, the card art, cards migration drift
npm run build    # must be clean
VITE_DEMO_MODE=true npm run build   # the review build must stay clean too
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
| 1 | Browser 1 | Create an account, confirm it, sign in | Onboarding |
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

### The screens the launch-gap work added

| # | Do | Expect |
|---|---|---|
| 18 | Onboard with a birthdate under 18 | The picker will not offer it; typing it shows "Kindred Spirits is for people of 18 and over" and the button stays disabled |
| 19 | Onboard choosing "interested in: women" only | Only women, and people who prefer not to say, appear in Matches |
| 20 | About you → "You, and who you are looking for" → change it | The feed changes without a reload |
| 21 | About you → Where you are → Use my location, set 25 km | Rows carry a place and a distance; people further away go |
| 22 | About you → Where you are → Forget my location | Distance stops mattering; everyone is back |
| 23 | SignIn → "I have forgotten my password" | "If that address has an account, a reset link is on its way to it" — the same whether or not it does |
| 24 | Open the link from that email | Only the new-password form, with no way into the app until it is set |
| 25 | Open a match you are connected to → Unmatch | The conversation closes for both; they stay on the Bowties wall |
| 26 | Connect with them again | The old thread and its messages are back |
| 27 | As a moderator, About you → Open moderation | The open reports, each with Dismiss, Mark actioned and Suspend |
| 28 | Suspend somebody, then sign in as them | "Your account is suspended", the reason, and nothing else |
| 29 | About you → Delete account → Delete for good | Straight back to the sign-in screen; the orphan query above still reads 0 |
| 30 | Open `/delete-account` with no account | The deletion-request page |

Demo mode (`VITE_DEMO_MODE=true`) has its own short pass: no sign-in screen,
the 35 seeded profiles in Matches, no photos and no block or report, a first
message to anyone gets one reply, and the gender and distance filters work on
the seeded data from `src/lib/gender.js` and `src/lib/place.js`.

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

Steps 18–30 have not been driven in a browser yet. Every rule behind them is
proved directly against the live database below, and over the API by
`scripts/rls-proof.mjs`.

## The launch-gap rules, 5 October 2026

Each rule was attacked in SQL as the real `authenticated` role, with
`request.jwt.claims` set to a member's own id, so RLS and the policies applied
exactly as they do to the app. Throwaway probe profiles were used and removed.

**The age gate.** A 17-year-old birthdate was refused with "Kindred Spirits is
for people of 18 and over"; exactly 18 today was accepted, so the boundary is
not off by one; and a date one day in the future still answered with the older,
more specific "A birthdate cannot be in the future", confirming that BEFORE
triggers fire in name order. A trigger only sees writes, so existing rows are
not revalidated — this is the query that checks whether any are under age:

```sql
select count(*) from public.profiles
 where birthdate is not null
   and birthdate > (current_date - interval '18 years')::date;
```

It read 0 before the gate was added, and reads 0 now.

**Account deletion.** With two members, a mutual match, a conversation holding
a message from each, and a report from one about the other: deleting the second
member's `auth.users` row left 0 profile rows, 0 connections, 0 participant
rows and 0 of their messages; the conversation row itself was gone, which it
was not before this migration; the other member's messages went with it; and
the report about them survived with `reported_id` null, `reported_deleted_at`
set and the reason intact. The reports grant is now
`INSERT (message_id, reason, reported_id)` only, so a client cannot choose its
own `id`, `created_at` or `reported_deleted_at`.

One asymmetry, recorded rather than fixed: deleting the **reporter's** account
still erases the report, because `reporter_id` is `ON DELETE CASCADE`.
`docs/DESIGN.md` carries it as an open question.

**Moderation and suspension.** A plain member read 0 reports; the reporter read
exactly their own; the moderator read all of them. A non-moderator suspending
was refused by the function's own check; reviewing a report touched 0 rows; and
a member writing to their own `suspended_at` got **"permission denied for table
profiles"**, which is the hole the RPC exists to close. A moderator suspending
themselves was refused by name. Suspending then hid the profile from both
`public_profiles` and `profiles`, left the suspended member reading their own
row and its reason, had RLS refuse their message and `start_conversation`
refuse them with "Your account is suspended", and reversed cleanly with the
reason cleared.

**Gender and mutual interest.** With a deliberately one-sided pair — a woman
seeking men, a man seeking women, a man seeking men, and one who prefers not to
say and seeks everyone — the woman saw the man seeking women and the
prefer-not-to-say profile, but **not** the man seeking men, so the filter runs
in both directions and not just the viewer's. The prefer-not-to-say member saw
all three. `public_profiles` has no `interested_in` column, and seeking
"prefer not to say" is refused by `profiles_interested_in_is_a_set`.

**Unmatch.** Matched, the pair read 1 conversation and 1 message. After one of
them unmatched: both read 0 conversations and 0 messages, and both had their
message insert refused by RLS. Both connection rows were gone, while the
conversation row and its message were still in the database — nothing is
destroyed. A third party calling `unmatch` on a **live** pair left both its
connections standing and the thread theirs. Reconnecting both ways brought the
same thread and the same message back.

**Distance.** Lisbon to Porto computes to 274.0 km. A member in Lisbon looking
25 km saw the same-city profile at 0.0 km and the one with no location at all,
but not Porto. From Porto looking *anywhere*, the Lisbon member was still
hidden, because the tighter of the two radiuses decides. A member with no
location saw everyone, at no distance, and was seen by everyone.
`public_profiles` has no `lat` or `lon` column. Half a coordinate is refused by
`profiles_latlon_together` and a radius of zero by `profiles_radius_range`.

## RLS proof

`scripts/rls-proof.mjs` signs real members in over the real API with the
publishable key: an owner and a partner who are a mutual match with a
conversation and a photo, an outsider, and optionally a moderator. Then it
attacks, as anon, as the outsider, as the partner and as the owner, and prints
what the API said. It exits non-zero if anything is allowed.

```sh
node --env-file=.env scripts/rls-proof.mjs path/to/accounts.json
```

`accounts.json` names existing accounts, each `{ email, password }`, under
`owner`, `partner`, `outsider` and optionally `moderator`. Section 6 — the
suspended-member attacks — only runs when a `moderator` is given whose profile
is in the `moderators` table, because nothing in the app can put it there; it
takes the service role or the dashboard. Without it that section says it was
skipped.

The run below created its four accounts directly in `auth.users`, since
confirmations are on and nobody owns those addresses. A hand-inserted row needs
its token columns set to `''` rather than left null, or sign-in answers
"Database error querying schema"; it also needs an `auth.identities` row.

Output from 5 October 2026:

```
API https://ofmlahcfcuhwykgzupey.supabase.co, publishable key, members signed in with their own passwords
owner 91e0890d-…   partner a7d261c5-…   outsider 3e12d237-…
moderator 50774751-…
conversation 6dac7218-… between owner and partner; photo 91e0890d-…/d05cd6bc-….png

refused  1. read conversations of the owner's conversation                  as anon       42501 permission denied for table conversations
refused  1. read conversation_participants of the owner's conversation      as anon       42501 permission denied for table conversation_participants
refused  1. read messages of the owner's conversation                       as anon       42501 permission denied for table messages
refused  1. read conversations of the owner's conversation                  as outsider   0 rows returned
refused  1. read conversation_participants of the owner's conversation      as outsider   0 rows returned
refused  1. read messages of the owner's conversation                       as outsider   0 rows returned
refused  1. open a conversation with the owner (no mutual match)            as outsider   42501 You can only start a conversation with a mutual match.
refused  2. send a message with the owner's sender_id                       as partner    42501 new row violates row-level security policy for table "messages"
refused  2. send a message with the owner's sender_id                       as outsider   42501 new row violates row-level security policy for table "messages"
refused  2. send a message with the owner's sender_id                       as anon       42501 permission denied for table messages
refused  2. check, as the owner: forged messages in the thread              as owner      0 found
refused  3. upload a new file into the owner's folder                       as anon       403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                     as anon       403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                        as anon       0 objects deleted
refused  3. upload a new file into the owner's folder                       as outsider   403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                     as outsider   403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                        as outsider   0 objects deleted
refused  3. upload a new file into the owner's folder                       as partner    403 AccessDenied new row violates row-level security policy
refused  3. overwrite the owner's photo                                     as partner    403 AccessDenied new row violates row-level security policy
refused  3. delete the owner's photo                                        as partner    0 objects deleted
refused  3. check, as the owner: folder unchanged                           as owner      1 files, identical to before
refused  4. set a birthdate 17 years old                                    as outsider   23514 Kindred Spirits is for people of 18 and over.
refused  4. set a birthdate born today                                      as outsider   23514 Kindred Spirits is for people of 18 and over.
refused  4. check: exactly 18 today is still allowed                        as outsider   accepted, as it should be
refused  5. read every report                                               as anon       42501 permission denied for table reports
refused  5. read every report                                               as outsider   0 rows returned
refused  5. read every report                                               as partner    0 rows returned
refused  5. review a report                                                 as outsider   0 rows updated
refused  5. review a report                                                 as partner    0 rows updated
refused  5. suspend another member                                          as outsider   42501 Only a moderator can suspend a profile.
refused  5. suspend another member                                          as partner    42501 Only a moderator can suspend a profile.
refused  5. read who the moderators are                                     as outsider   0 rows returned
refused  5. make yourself a moderator                                       as outsider   42501 permission denied for table moderators
refused  6. send a message while suspended                                  as partner    42501 new row violates row-level security policy for table "messages"
refused  6. open a conversation while suspended                             as partner    42501 Your account is suspended.
refused  6. a suspended member appears in the feed                          as outsider   0 rows returned
refused  7. a third party unmatching a pair they are not in                 as outsider   the call ran; the pair still has 1 connection from the owner
refused  7. send into the conversation after unmatching                     as owner      42501 new row violates row-level security policy for table "messages"
refused  7. send into the conversation after unmatching                     as partner    42501 new row violates row-level security policy for table "messages"
refused  7. still read the conversation after unmatching                    as owner      0 rows returned
refused  7. still read the conversation after unmatching                    as partner    0 rows returned
refused  7. check: rematching reopens the same thread                       as owner      1 message(s) still there
refused  8. call delete-account with no token at all                        as anon       401 {"error":"Sign in to delete your account."}
refused  8. call delete-account with the publishable key as a bearer token  as anon       401 {"error":"That session is not valid."}
refused  8. call delete-account with a forged bearer token                  as anon       401 {"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}
refused  8. check, as the owner: the account still exists                   as owner      1 row(s)

46 attempts, 46 refused, 0 allowed
```

The forged `sender_id` is refused even from the partner, who is a member of the
conversation: the insert policy checks `sender_id = auth.uid()`, not only
membership.

Two notes on what section 8 can and cannot show. `delete-account` reads the
member from the caller's own token and never reads the request body, so there
is no target to forge — the body above names the owner and is ignored. That
property is structural, in
`supabase/functions/delete-account/index.ts`, and the only attacks that do not
destroy one of the fixtures are the ones arriving without a usable token. The
function is also deployed with `verify_jwt: true`, so the gateway turns most of
them away before the code runs.

Section 7's third-party attempt deliberately runs **before** the owner
unmatches. Run afterwards it proves nothing, because the rows it must not touch
are already gone — the first version of both this check and its SQL equivalent
had that fault.

## Advisors

Read after every migration in this pass.

- **Security:** one warning throughout, "Leaked password protection disabled".
  It is an Auth setting Supabase offers only on the Pro plan, and this
  project's organization is on the free plan, so it cannot be switched on here.
  It disappears while the project has no users and returns as soon as it has
  any, exactly as predicted when it was first recorded. Nothing else has ever
  been reported.
- **Performance:** two findings were introduced by this pass and then fixed.
  `reports.reviewed_by` had no covering index, so `reports_reviewed_by_idx` was
  added. Adding the moderator reads as separate policies raised "multiple
  permissive policies" on `profiles` and `reports` for `SELECT`, so they were
  folded into the existing policies instead — each table has exactly one SELECT
  policy again, and both findings are gone.
- What remains is "unused index", INFO, on `reports_open_idx`,
  `reports_reviewed_by_idx` and `profiles_suspended_idx`. All three cover
  nearly empty tables; dropping them would raise the unindexed foreign key or
  slow the moderation queue once there is one. The same notices were already
  recorded for `blocks` and `reports` for the same reason.
