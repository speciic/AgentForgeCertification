# AgentForge — Workshop Website & Certificate Portal

Website for **AgentForge: A 3-Day Hands-on AI Agent Builder Workshop**
(SPEC Innovation and Incubation Center & Dept. of CSE, St. Peter's Engineering College, 6–8 October 2026),
themed to match the participation certificate.

Participants search by **name, roll number or registered email** and download their personalised
certificate as **PNG** (4800×3200) or **PDF**. Everything runs in the browser — no backend.

## Run locally
```bash
node server.js          # → http://localhost:5173
```
(Or open `dist/index.html` directly — it's a single self-contained file.)

## Structure
```
index.html              Page markup
css/style.css           Theme (neon night: violet → magenta → orange)
css/fonts.css           Local fonts (Montserrat, Cinzel, Kaushan Script, JetBrains Mono)
js/app.js               Nav, starfield, cohort chart, lookup, downloads
js/certificate.js       Canvas renderer + PNG/PDF export (name position config at the top)
js/data.js              AUTO-GENERATED participant data
data/participants.csv   Source of truth — 183 participants (name, roll, dept, year, email)
assets/template.jpg     Blank certificate template
scripts/build-data.mjs  CSV → js/data.js
scripts/bundle.mjs      Everything → dist/index.html (single file, ~3 MB)
server.js               Zero-dependency dev server
```

## Updating participants
1. Edit `data/participants.csv` (add / fix rows; year is 1–4, dept is CSE/CSM/CSD/ECE/CSC).
2. `node scripts/build-data.mjs`
3. `node scripts/bundle.mjs` (to refresh `dist/index.html`)

## Deploy
Upload either the whole folder or just `dist/index.html` to any static host
(Netlify drop, Vercel, GitHub Pages, college server).

## Notes
- Mobile numbers from the participant list are intentionally **not** included in the site.
- Name search is forgiving: partial names, any word order, initials/dots, missing spaces and small typos all work.
  If several people match, a pick list shows name, dept, year and a masked roll number.
- Two participants have no email on record (24BK1A0516, 26BK1A66R1) — they can look up by name or roll number.
- Names are auto title-cased on the certificate ("nithya sree" → "Nithya Sree"). Fix spelling in the CSV.
