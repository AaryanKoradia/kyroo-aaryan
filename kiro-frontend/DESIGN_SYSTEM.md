# KYROO Design System — Color Reference

Canonical source of truth: `app/globals.css` (`:root` block). Every color used
across the marketing site, onboarding, pricing, payment, and success pages
should come from this palette via `var(--k-*)` — don't hardcode new hex
values.

## Core palette

| Token | Hex | Role | Used in |
|---|---|---|---|
| `--k-paper` | `#f4efe4` | Primary background (cream) | Page backgrounds, card fills, unselected buttons |
| `--k-paper-2` | `#ece5d4` | Secondary background | Section alternation (e.g. "How it works" band), slightly darker panels |
| `--k-ink` | `#14120f` | Primary text / borders / shadows | Body text, all borders (2–3px solid), all hard-offset shadows, dark section backgrounds (nav, footer, CTA bands) |
| `--k-coral` | `#ff4a2e` | Primary accent (CTA / alert) | "Start free" buttons, coral tags, spending-alert nudge color, headline highlight word |
| `--k-coral-dark` | `#d63a20` | Coral hover/pressed state | Rarely used directly; reserve for interaction states |
| `--k-lime` | `#cfff3d` | Secondary accent (selected / success state) | Selected form options, primary CTA buttons, "hot" pricing plan background, progress bars |
| `--k-blue` | `#2b46ff` | Tertiary accent | "Mind" domain tag, workout-nudge color, testimonial accent |
| `--k-purple` | `#7b3fff` | Quaternary accent | "Mind"/"Evening" feature + timeline accents |

Everything renders on `--k-ink` borders with **flat, hard-offset shadows**
(`Npx Npx 0 var(--k-ink)` — no blur, no spread) and 2–3px solid `--k-ink`
borders. Never use soft/blurred box-shadows or thin 1px borders — that's the
old pre-redesign look (see Deprecated section below).

## Ink opacity scale (text hierarchy, muted UI)

Rather than separate gray tokens, muted text/borders are `--k-ink` at
reduced alpha via `rgba(20,18,15,X)`:

| Alpha | Use |
|---|---|
| `rgba(20,18,15,0.72)` | Secondary hero subtext |
| `rgba(20,18,15,0.5)` | Form labels, muted metadata |
| `rgba(20,18,15,0.35)` | Input placeholder text |
| `rgba(20,18,15,0.14)` | Default (unselected) button/card border |
| `rgba(20,18,15,0.1)`–`0.12` | Hairline dividers, list-item borders |

`20,18,15` is the RGB decomposition of `--k-ink` (`#14120f`) — keep using
that triple so everything stays on-palette; don't introduce a different gray.

## Typography tokens (companion to color, same `:root` pattern)

Defined in `app/layout.tsx`, consumed the same way as colors:

| Token | Font | Role |
|---|---|---|
| `--font-display` | Archivo Black | Headlines, big uppercase display text |
| `--font-body` | Space Grotesk | Body copy, buttons, form UI |
| `--font-mono-tag` | JetBrains Mono | Tags, badges, uppercase micro-labels |

## Deprecated — do not use for new work

`app/chat/page.tsx` (the internal `ChatTest` dev utility, not part of the
public funnel) still runs the **old pre-redesign dark theme** and was
intentionally left un-migrated. Its colors (`#0f0f0f`, `#111`, `#161616`,
`#f0ede8`, `#c8f060`, `rgba(240,237,232,X)`) are legacy and should never be
copied into new/public-facing pages. If that page ever gets the brutalist
treatment, replace them 1:1 with the tokens above (`#c8f060` → `--k-lime`,
`#f0ede8`/`rgba(240,237,232,X)` → `--k-ink` equivalents on a light bg, etc.).

## Quick copy-paste block

```css
--k-paper: #f4efe4;
--k-paper-2: #ece5d4;
--k-ink: #14120f;
--k-coral: #ff4a2e;
--k-coral-dark: #d63a20;
--k-lime: #cfff3d;
--k-blue: #2b46ff;
--k-purple: #7b3fff;
```
