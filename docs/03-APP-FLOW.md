# 3. App Flow: zPass

**Purpose:** Show each screen, user path, and result of a tap or click.

Related: [01-PRD.md](01-PRD.md), [04-UI-UX-BRIEF.md](04-UI-UX-BRIEF.md)

---

## 3.1 Entry points

| Entry point | Arrives at | Who |
|---|---|---|
| Home `zpass.app/` (shared on X / Zcash forum / Telegram) | Home | New holders, developers |
| Telegram: DM `@zpass_gate_bot` or tap "Join holders chat" in a public channel | Bot DM → prover link `/tg/{sessionId}` | Holders |
| Poll link `/p/{pollId}` | Poll page | Holders, public (tally) |
| "Sign in with zPass" button on a third-party site → `/signin?client_id=…` | Sign-in prover | Holders |
| Developer docs `/developers` and the npm README | Docs | Developers |
| Beacon explorer `/beacon` (linked from README and the threat model) | Root log | Auditors |
| Installed PWA icon | Dashboard | Returning holders |

## 3.2 Screen inventory

| # | Screen | Route | Purpose | Required data |
|---|---|---|---|---|
| S1 | Home | `/` | Explain zPass in one line. CTAs: **Get your pass**, **For developers** | Public stats (groups, members, epochs) |
| S2 | Choose group | `/enrol` | Pick the collection or credential (e.g. "zkSNARKs", "Zcon7 attendee") | `GET /v1/groups` |
| S3 | Connect holdings | `/enrol/{group}` | Enter holder account. Request the memo challenge | Group, holder account |
| S4 | Enter code | `/enrol/{group}/code` | Type the `ZPC` code received in the wallet. Pick which items to enrol | Challenge ID, items owned |
| S5 | Create identity | `/enrol/{group}/identity` | Create (or reuse) the local identity, set passphrase, show and confirm the backup phrase | Local vault |
| S6 | Enrolment pending | `/enrol/{group}/done` | "Joins the group at the next epoch (≤ 1 h)" with countdown | Next epoch time |
| S7 | Dashboard | `/me` | Passes (group, status, epoch joined), backup status, recent uses (local log only) | Local vault, `GET /v1/groups/{g}/epochs/latest` |
| S8 | Unlock vault | modal | Enter passphrase to decrypt the identity for a proof | Local vault |
| S9 | Prove (generic) | component used by S10–S12 | Generate proof in a worker, show progress, submit | Group members at the latest beacon epoch, scope, message |
| S10 | Telegram prove | `/tg/{sessionId}` | Prove membership for a gated chat, get the invite | Session (chat title, group, `minAnonSet`) |
| S11 | Poll | `/p/{pollId}` | Question, options, live tally, **Vote anonymously** | Poll, tally |
| S12 | Sign in with zPass | `/signin` | Show requesting app + what it learns, prove, redirect back | OIDC client, redirect URI |
| S13 | Create poll | `/polls/new` | Developer/community creates a poll (scope) | API key, group, options, closes at |
| S14 | Backup and recovery | `/me/backup` | Export backup phrase, import identity on a new device | Local vault |
| S15 | Beacon explorer | `/beacon` | Root history per group with txids and the public viewing key. "Verify yourself" CLI instructions | `verifier.beacon_roots` |
| S16 | Developers | `/developers` | 15-line quickstart, API key creation, scope registration | API key session |
| S17 | Threat model | `/how-it-works` | Plain-language privacy guarantees and limits | Static |
| S18 | Error / 404 | — | Recover from bad links | — |

## 3.3 Primary journey (enrol → prove in Telegram)

**S1 Home** → tap **Get your pass** → **S2 Choose group** → pick "zkSNARKs" → **S3 Connect holdings** → enter holder account, tap **Send me a code** → (issuer sends `ZPC:` memo to the address on record) → **S4 Enter code** → type code, select items → **S5 Create identity** → set passphrase, confirm backup words → **S6 Enrolment pending** → epoch closes → **S7 Dashboard** shows "Active ✓".

Then: Telegram DM `/start` → bot replies with a button → **S10 Telegram prove** → **S8 Unlock** → **S9 Prove** (~2–5 s) → **success: "Proof accepted. Your invite is in Telegram."** → bot DM contains a one-time invite link.

### Other primary journeys

- **Vote:** S11 → **Vote anonymously** on an option → S8 → S9 → success: "Vote counted. Nobody can tell it was you." → tally updates.
- **Sign in:** third-party site → S12 → **Continue** → S8 → S9 → redirect back with the code → the app shows the user as signed in (pseudonymous ID).
- **Developer:** S16 → create API key → `npm i @zpass/verify` → copy the 15-line snippet → S13 creates a poll scope or an app scope.
- **Auditor:** S15 → copy the viewing key → run `zpass-beacon scan --ufvk … --from …` → compare with the table.

## 3.4 Action specifications

| Screen · Action | Trigger | Validation | Loading state | Success state | Error state | Next screen |
|---|---|---|---|---|---|---|
| S3 · Send me a code | Tap | Holder account exists and owns ≥ 1 item in the group. Max 3 challenges per account per hour | "Sending a shielded memo to your wallet… (≈ 1 block)" | "Check your wallet for a memo starting with ZPC:" | Unknown account: inline. Rate limited: "Try again in N min". Send failed: retry | S4 |
| S4 · Verify code | Submit | 8 chars, Crockford base32. ≤ 5 attempts. Not expired (30 min) | Button spinner | Items listed with checkboxes (already-enrolled items disabled) | Wrong code: "Code doesn't match (N tries left)". Expired: "Send a new code" | S5 |
| S5 · Create identity | Tap **Create** | Passphrase ≥ 12 chars, strength meter ≥ "good". Backup confirmation: 3 random words | "Creating your identity on this device…" | "Identity created. Only this device knows it." | Weak passphrase: inline. Wrong words: inline | S5 (submit) |
| S5 · Submit commitments | Auto after create | Enrolment token valid. One commitment per item | Spinner | Commitments queued `pending` | Token expired: back to S3. Item already enrolled: skip with notice | S6 |
| S5 · Use existing identity | Tap (if a vault exists) | Passphrase decrypts the vault | Spinner | Reuses the same identity for the new group | Wrong passphrase: inline | S6 |
| S6 · Wait for epoch | Auto, poll every 30 s | — | Countdown "Next epoch in 37 min" | "You're in. Your pass is active." + notification if allowed | Epoch post failed: "Delayed, we'll retry". Nothing for the user to do | S7 |
| S8 · Unlock | Submit | Passphrase decrypts | Spinner | Modal closes. The identity stays in memory for 10 min | Wrong passphrase: inline, 5-attempt soft lockout of 1 min | caller |
| S9 · Generate proof | Tap action (Join / Vote / Continue) | Member is `active` at the latest beacon root. Group size ≥ `minAnonSet` | Progress: "Loading group (N members)" → "Proving… (a few seconds)" | Proof submitted | Not yet active: "Your pass activates at the next epoch". Anon set too small: "This group is too small to stay private (N/25). Try later". Worker crash: retry. Artefacts failed: retry download | caller success |
| S10 · Join chat | Tap **Prove and join** | Session valid (15 min). Scope `tg:{chatId}` | S9 states | "Proof accepted. Your invite is in Telegram." | Session expired: "Ask the bot for a new link". `NULLIFIER_USED`: "This pass already joined this chat" | Telegram |
| S11 · Vote | Tap option + **Vote anonymously** | Poll open. Message = option index | S9 states | Tally updates. "Vote counted" | `NULLIFIER_USED`: "Already voted with this pass". Poll closed: disabled | S11 |
| S12 · Continue | Tap | `client_id` registered. `redirect_uri` matches exactly. State present | S9 states | Redirect to `redirect_uri?code=…&state=…` | Unknown client / bad redirect: error page, no redirect | third-party app |
| S13 · Create poll | Submit | Question 5–200 chars. 2–10 options. Closes in 1 h–30 d. Group exists | Spinner | Poll link + embed code | Field errors | S11 |
| S14 · Export backup | Tap | Passphrase re-entered | — | Backup phrase shown (blurred until tapped), copy, download as file | Wrong passphrase | S14 |
| S14 · Import | Submit phrase | Valid phrase (checksum) + new passphrase | Spinner | Vault restored. Passes listed by matching commitments to group member lists | Invalid phrase. No matching commitments: "Identity restored, but it isn't in any group yet" | S7 |

## 3.5 Alternate journeys

| Journey | Path |
|---|---|
| **Cancel enrolment** | Any of S3–S5 → **Cancel** → S2. Nothing stored (a verified challenge expires unused) |
| **Didn't receive the code** | S4 → **Resend** (after 2 min) or "Code not showing?" help (wallet memo display tips) |
| **Enrol another group later** | S7 → **Add a pass** → S2. Reuses the identity (S5 "Use existing") |
| **Return during pending** | S7 shows "Pending, activates in N min" |
| **Skip backup** | Not allowed. Backup confirmation is mandatory before commitments are sent |
| **New device** | S14 import → S7 |
| **Lost passphrase and backup** | No recovery is possible (by design). Re-enrol: the issuer removes the old commitment for those items and adds the new one at the next epoch (requires a new memo challenge) |
| **Item sold** | Next epoch removes the seller's leaf. S7 shows "Item #… transferred, pass inactive" for that item if the holder rechecks |
| **Proof in Telegram from desktop while the vault is on the phone** | S10 shows a QR to continue on the phone |

## 3.6 Navigation rules

- **Top bar (desktop):** logo → `/`, My passes, Polls, Developers, Beacon, How it works.
- **Mobile:** bottom tab bar with **Passes**, **Polls**, **More** (Developers, Beacon, How it works, Backup).
- **Back behaviour:** the enrol flow is linear. Back from S4 → S3 keeps the challenge. Back from S5 after commitments were submitted → S7 (can't resubmit). Prover pages (S10–S12) don't go back during proving; cancel returns to the caller.
- **Deep links:** `/tg/{sessionId}`, `/p/{pollId}`, `/signin?...`, `/enrol/{group}`, `/beacon?group=…`. The PWA handles these when installed.
- **URL privacy:** no commitment, nullifier, passphrase or holder account in URLs. The Telegram session ID is random and single-use and carries no Telegram user ID.

## 3.7 Empty and blocked states

| State | Where | What the user sees |
|---|---|---|
| No passes | S7 | "No passes yet." + **Get your pass** |
| Holder owns no items in the group | S3 | "We couldn't find items for this account in zkSNARKs." + support link |
| Group below `minAnonSet` | S9 | "This group has N members. Proofs unlock at 25 so nobody can be singled out." |
| Pending (not yet in a beacon root) | S9, S7 | "Activates at the next epoch (≈ N min)" |
| No polls | `/polls` | "No open polls." + **Create a poll** (developers) |
| Vault locked / wrong passphrase | S8 | Inline error + "Forgot passphrase? Restore from backup" |
| IndexedDB unavailable (private mode) | S5 | Blocking notice: "Private browsing can't keep your pass. Use a normal window." |
| Offline | Global | "You're offline." Proving needs the latest root, so prove actions are disabled. Cached dashboard still shows |
| Beacon behind | S9 | "Waiting for the latest root to appear on Zcash (≈ 25 s)." |
| Telegram session expired | S10 | "This link expired. Message the bot again." |
| Browser lacks WebAssembly / Workers | S9 | "Your browser can't generate proofs. Use a recent Chrome, Firefox or Safari." |

## 3.8 First-use journey

**Holder:**
1. S1 explains in one line: "Prove you belong. Reveal nothing else." Three cards: *Prove once, use everywhere* → *Nobody can link your uses, not even the issuer* → *Works when you change wallets*.
2. S2 → S3 → S4 (memo challenge). The help panel shows where memos appear in Zodl, Zashi and Vizor.
3. S5 creates the identity with a mandatory backup. A prompt suggests installing the PWA.
4. S6 explains epochs ("joining in a batch keeps you hidden in the crowd").
5. First proof (S9) shows a one-time explainer of what the verifier learns: "member of zkSNARKs at epoch N, plus a one-time tag for this chat".

**Developer:**
1. S16 → create an API key (shown once).
2. Copy the quickstart (`npm i @zpass/verify`, 15 lines).
3. Register a scope or create a poll (S13). Test with the staging group.

**Telegram admin:**
1. Add `@zpass_gate_bot` as admin with "Invite users via link" permission.
2. Send `/gate zksnarks 25` in the group → the bot confirms the group and `minAnonSet`.
3. Set the chat to private (join by invite only).
