# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UniBite** is a student food-sharing platform for university students. Cooks post surplus home-cooked meals; consumers request portions using a credit-based points system. The UI is in Greek.

## Running the Project

```bash
npm install
npm run dev      # nodemon auto-reload (development)
npm start        # node server.js (production)
```

Server runs on `http://localhost:3000`. There is no build step, no test runner, and no linter.

## Architecture

**Backend:** Node.js + Express. Four route files under `routes/`, a single `database.js` for SQLite schema init, and `cron.js` for scheduled tasks. Entry point is `server.js`.

**Frontend:** A single `public/index.html` containing all HTML, embedded CSS, and inline JavaScript. It is a full SPA — no page reloads, all views toggled via `navigate(viewName)`. Session state lives in `localStorage` as a JSON object (`currentUser`). All server communication uses `fetch()` + JSON exclusively.

**Database:** SQLite file (`unibite.sqlite`) with 6 tables: `users`, `posts`, `requests`, `deliveries`, `ratings`, `credit_ledger`.

## Hard Constraints (from REQUIREMENTS.md)

Do not deviate from these:

- **No JS frameworks** on the frontend — pure vanilla HTML/CSS/JS only.
- **No page reloads** — all DOM updates via JavaScript.
- **Fetch API only** for client-server communication.
- **Leaflet.js** for the map; geolocation filtering and distance sorting are required features.
- **48-hour post expiry** enforced via SQLite `datetime('now', '+48 hours')`.
- **Credit system** is mandatory: new user +5, request -1, no-show -1, no-rating-in-48h -1, confirmed pickup gives cook +1.

## Credits & Business Logic Flow

All credit movements are recorded in `credit_ledger`. The lifecycle:

1. Consumer requests a portion → -1 credit immediately.
2. Cook approves → a `deliveries` row is created (`status: pending`).
3. Cook marks delivery complete → `status: completed` **and cook receives +1 credit immediately**.
4. Consumer rates within 48h → if score is 4 or 5 stars, cook receives **+1 bonus credit immediately**; 1–3 stars → rating recorded for feedback only, no credit movement.
5. `cron.js` runs hourly: finds completed deliveries older than 48h with no rating → auto-rates 3 stars and deducts 1 credit from consumer.

## API Routes

| Prefix | File | Responsibility |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Register, login |
| `/api/posts` | `routes/posts.js` | CRUD for food posts |
| `/api/business` | `routes/business.js` | Requests, approvals, deliveries, ratings |
| `/api/admin` | `routes/admin.js` | Stats and leaderboards |
| `/api/health` | `server.js` | Health check |

## Authentication

No JWT — login returns `{user: {id, name, role, credits}}` stored in `localStorage`. Role is `student` or `admin`. Protected routes check `user_id` passed in the request body (not a header token).

## Frontend Patterns

- `navigate(viewName)` hides all sections and shows `#<viewName>-view`.
- `escapeHTML(str)` must wrap all user-supplied strings rendered into the DOM to prevent XSS.
- The Leaflet map is initialized once globally and reused. Post markers use deterministic dummy coordinates derived from post ID, centered on University of Patras (38.2882, 21.7889).
- Sold-out posts (0 portions available) are rendered with `opacity: 0.5`.

## CSS Design Tokens

```css
--primary: #e66a00
--primary-dark: #cc5c00
--primary-light: #fff4ec
--bg: #f7f8fa
--surface: #ffffff
--text: #111827
--muted: #4b5563
--border: #e5e7eb
--radius: 14px
```

Responsive breakpoints: `768px` (2-col grid, horizontal navbar), `1024px` (3-col grid).
