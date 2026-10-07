# 4. UI and UX Design Brief: zPass

**Purpose:** Give the app a consistent, usable visual direction.

Related: [03-APP-FLOW.md](03-APP-FLOW.md)

---

## 4.1 Audience and tone

**Audience:** Zcash community members and zkSNARKs holders (privacy-motivated, crypto-native, often on mobile coming from Telegram or X), community admins, and JS developers integrating the SDK.

**Three design adjectives:** **Discreet** (shows only what's needed, never the user's identity), **Warm** (a membership card, a club, not a security console), **Certain** (clear yes/no states: active, accepted, already used).

**Voice:** friendly and exact. "You're in. Nobody can tell which pass you used." Avoid "anonymous forever", "unhackable" or "fully untraceable". State limits plainly ("The issuer knows you enrolled. It can't see what you do with your pass.").

## 4.2 Reference products

| Product | Borrow | Avoid |
|---|---|---|
| [Apple Wallet passes](https://developer.apple.com/wallet/) | The pass-as-card metaphor, a clear active/expired state | Skeuomorphic gloss |
| [Zupass](https://zupass.org) | Proof-first flows, "what this app learns" disclosure | Dense dev-tool styling on holder screens |
| [Semaphore docs/demo](https://demo.semaphore.pse.dev) | Simple prove-and-verify steps | Developer jargon in holder UI |
| [Telegram Mini Apps](https://core.telegram.org/bots/webapps) | Fast, thumb-first, bottom-anchored actions | Cramped layouts |
| [Linear](https://linear.app) | Clean type hierarchy, hairline borders | Heavy dark-only aesthetic |
| [Snapshot](https://snapshot.org) | Poll layout and live tally | Wallet-address-forward identity display |

## 4.3 Color palette

Light theme is the default (warm, approachable). Dark theme has full parity. Tokens are CSS variables in `apps/web/src/app/globals.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F6F2` | `#0E0E12` | Page background |
| `--surface` | `#FFFFFF` | `#17171D` | Cards, sheets |
| `--surface-2` | `#EFEDE7` | `#202028` | Inputs, nested panels |
| `--border` | `#E2DFD7` | `#2B2B35` | Hairlines |
| `--text` | `#17161C` | `#EDEBF2` | Primary text |
| `--text-muted` | `#5E5C66` | `#A09EAB` | Secondary text |
| `--primary` (Pass indigo) | `#4B3FE0` | `#8B80FF` | Primary buttons, links, focus ring |
| `--primary-ink` | `#FFFFFF` | `#0E0E12` | Text on primary |
| `--accent` (Zcash gold) | `#C98F06` | `#F4B728` | The pass card edge and the "member" badge only |
| `--success` | `#1F8A5B` | `#3FB37F` | Active pass, proof accepted, vote counted |
| `--warning` | `#A86F00` | `#E5A50A` | Pending epoch, small anon set |
| `--danger` | `#C62F35` | `#E5484D` | Errors, rejected proofs |
| `--info` | `#2369B3` | `#3E8EDE` | Neutral notices |

**Pass card gradient** (signature element): `linear-gradient(135deg, var(--primary), #2A2370)` with a 2 px gold edge (`--accent`). Used only on the pass card and the success stamp.

Contrast: all text pairs ≥ 4.5:1. Primary indigo on white is 7.1:1.

## 4.4 Typography

| Role | Font | Size / line-height | Weight |
|---|---|---|---|
| Display (hero, pass card name) | **Space Grotesk** | 40/44 (mobile 32/36) | 600 |
| H1 | Space Grotesk | 28/34 | 600 |
| H2 | Space Grotesk | 22/28 | 600 |
| H3 | **Inter** | 18/24 | 600 |
| Body | Inter | 16/24 | 400 |
| Small / labels | Inter | 14/20 | 500 |
| Caption | Inter | 12/16 | 500 |
| Codes, roots, nullifiers, txids | **JetBrains Mono** | inherits | 400, `tabular-nums` |

Why: Space Grotesk gives a distinct, slightly playful identity for a membership product. Inter keeps long-form explanations very readable at small sizes on phones. All three are self-hosted via `next/font` (no third-party font requests).

## 4.5 Components

| Component | Spec |
|---|---|
| **Button** | Primary (indigo), secondary (surface + border), ghost, danger. Heights 44 px (md), 52 px (lg, mobile primary). Radius 12 px |
| **Pass card** | 1.586:1 (credit-card ratio), group name, status pill, "Member since epoch N", gold edge. No item number, no address, ever |
| **Code input** | 8 single-character cells, mono, auto-advance, paste support |
| **Passphrase field** | Show/hide toggle, strength meter, helper text |
| **Backup phrase grid** | 12 words in a 3×4 grid, blurred until tapped, copy and download buttons |
| **Proof progress** | 3-step inline progress (Load group → Prove → Verify) with a time hint |
| **Disclosure box** | "What this app learns" list (✓ you're a member of X, ✓ a one-time tag for this app, ✗ which item, ✗ your address, ✗ who you are) |
| **Poll option** | Radio card with label + live bar (percentage + count), mono numbers |
| **Status pill** | `pending` · `active` · `transferred` · `revoked` |
| **Beacon table** | Epoch · Root (chip) · Size · Txid (chip) · Time |
| **Alerts / toasts** | Inline alerts for blocking issues, toasts (4 s) for confirmations |
| **Navigation** | Top bar (desktop), bottom tab bar (mobile, 3 tabs) |
| **Modal / sheet** | Unlock vault as a bottom sheet on mobile |
| **Success stamp** | The signature detail: the pass card flips once to show a check (400 ms, respects reduced motion) |

## 4.6 Layout rules

- **Grid:** 12 columns / 24 px gutters (desktop), 4 columns / 16 px gutters (mobile). Max content width 1040 px. Flow screens max width 440 px (fits Telegram's in-app browser).
- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Design mobile first at 375 px and test inside Telegram's in-app browser.
- **Radius:** 8 (chips), 12 (buttons, inputs), 16 (cards), 24 (sheets, pass card).
- **Elevation:** hairline borders. One shadow for the pass card and modals.
- **Thumb zone:** primary actions bottom-anchored on mobile flow screens.

## 4.7 Screen notes

| Screen | Hierarchy (top → bottom) |
|---|---|
| S1 Home | Headline "Prove you belong. Reveal nothing else." → pass card illustration → **Get your pass** / For developers → 3 explainer cards → live stats (groups, members, epochs on Zcash) |
| S3 Connect holdings | Group header → holder account field → what happens next (a memo arrives in your wallet) → **Send me a code** |
| S4 Enter code | Code input → item checklist → **Verify** → help ("Where do I find the memo?") |
| S5 Create identity | Why this stays on your device → passphrase → backup phrase → confirm words → **Create pass** |
| S6 Pending | Pass card (pending state) → countdown → why batching protects you |
| S7 Dashboard | Pass cards stack → backup status banner (if not backed up) → **Add a pass** → recent uses (local only) |
| S10 Telegram prove | Chat name + group → disclosure box → **Prove and join** → progress → success stamp |
| S11 Poll | Question → options with live tally → **Vote anonymously** → disclosure box (collapsed) → "N votes · closes in …" |
| S12 Sign in | Requesting app (name, domain) → disclosure box → **Continue** / Cancel |
| S15 Beacon | Explainer + public viewing key (copy) → group selector → beacon table → "Verify it yourself" CLI snippet |
| S16 Developers | 15-line quickstart (copyable) → API keys → scopes → links to npm and docs |

## 4.8 Accessibility

- WCAG 2.2 **AA**. Text ≥ 4.5:1. UI components ≥ 3:1.
- Keyboard: full flow navigable, visible 2 px indigo focus ring (offset 2 px), Esc closes sheets, focus trapped and restored.
- Code input works as a single field for screen readers (`aria-label="8-character code"`), with paste support.
- The backup phrase is readable by screen readers only after an explicit reveal.
- Proof progress and vote results announced via `aria-live="polite"`.
- Touch targets ≥ 44 × 44 px. Bottom-anchored primary buttons 52 px.
- Respect `prefers-reduced-motion` (no card flip) and `prefers-color-scheme`.
- Status is never color-only (pill text + icon).
- Telegram in-app browser tested with large system font sizes.

## 4.9 Interaction states

| State | Treatment |
|---|---|
| Hover | Buttons +6% lightness. Cards: border → `--text-muted` |
| Focus | 2 px `--primary` ring, 2 px offset |
| Active | −4% lightness, 98% scale (none with reduced motion) |
| Disabled | 40% opacity + a reason ("Poll closed", "Activates at next epoch") |
| Loading | Skeletons for lists. Button keeps width with an inline spinner. Proof progress with step labels and a time hint |
| Error | `--danger` icon + what happened + next step. Proof errors map to plain messages (`NULLIFIER_USED` → "Already used with this pass") |
| Success | Pass card flip/stamp for proofs, toast for minor saves |
| Pending | `--warning` pill + countdown to the next epoch |
| Empty | Short message + one action |

## 4.10 Assets needed

| Asset | Format | Owner / due |
|---|---|---|
| zPass logo (wordmark + "Z-pass" glyph), light/dark | SVG | Design (B), Oct 14 |
| Favicon, PWA icons (192/512, maskable), OG image | PNG/SVG | Design, Oct 14 |
| Pass card artwork per group (zkSNARKs, Zcon7 demo) | SVG | Design, Oct 16 |
| Icon set | **Lucide** (MIT) | npm `lucide-react` |
| Wallet logos for the memo-help panel (Zodl, Zashi, Vizor) | SVG | Press kits, used per brand rules |
| Telegram bot avatar + description image | PNG 512 | Design, Oct 15 |
| "How it works" diagram (enrol → epoch → beacon → prove → verify) | SVG | B, Oct 21 |
| "Issuer can't link" demo visual | SVG/PNG | A, Oct 23 |
| Screenshots + demo video (≤ 3 min) | PNG/MP4 | B, Oct 26 |
