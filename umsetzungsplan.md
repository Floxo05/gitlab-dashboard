### Aktualisierter Schritt‑für‑Schritt‑Plan (PAT‑Login, Boards‑First, keine Mutationen, Docker/CapRover)

Deine Anmerkungen sind eingearbeitet: kein OAuth, sondern Login über Personal Access Token (PAT); Fokus zunächst auf Übersichten, Abhängigkeiten und Board‑Darstellung; Epics vorhanden; Deployment über CapRover mit funktionierendem Dockerfile; Node 24; Next.js aktuell.

---

### Phase 0 – Grundlagen & Projektstruktur
Ziele:
- Saubere Basisstruktur mit App Router (Next 16), Tailwind v4, Typing/ESLint.
- Desktop‑optimiertes Grundlayout (Header + Sidebar), erste Routen.

Deliverables:
- Struktur: `app/(public)/login`, `app/(dashboard)/dashboard`, `app/api/gitlab/*` (Proxy)
- `.env.example`: `GITLAB_BASE_URL` (deine self‑hosted URL), optionale `ALLOWED_GITLAB_HOSTS` (Whitelist), `ENCRYPTION_SECRET` (für PAT‑Verschlüsselung), `NODE_ENV`, `PORT`
- Minimaler Layout‑Frame mit Platzhalter für Board/Graph.

Erfolgskriterien:
- App startet lokal (Node 24), Lint/Typecheck sauber, Basislayout steht.

Status: erledigt (16.11.2025)

---

### Phase 1 – Login über GitLab PAT (ohne DB, ohne OAuth)
Ziele:
- Sicherer „Login“: User gibt PAT ein; Token wird nie an Client‑JS geleakt.
- Keine Persistenz: PAT in httpOnly, `Secure`, `SameSite=Lax` Cookie, serverseitig verschlüsselt/sealed (z. B. AES‑GCM/`iron-seal`).

Deliverables:
- Login‑Form (Server Action/Route Handler) akzeptiert PAT, validiert via leichter Probe (z. B. `GET /user`), setzt verschlüsseltes Cookie.
- Middleware/Server‑Utils, die das Cookie entschlüsseln und das PAT nur serverseitig für Upstream‑Calls injizieren.
- Logout‑Route: löscht Cookie sicher.

Erfolgskriterien:
- Login mit gültigem PAT funktioniert, ungültig → klare Fehlermeldung; PAT bleibt unsichtbar für Client‑JS.

Sicherheitsnotizen:
- Cookie‑Inhalt nur verschlüsselt; keine Logs mit Token.
- Optional Rate‑Limit für Login‑Route; CSP/HSTS in Prod.

---

### Phase 2 – API‑Proxy (REST + GraphQL) mit PAT‑Injection
Ziele:
- Einheitliche serverseitige Endpoints, die das PAT sicher beifügen und CORS vermeiden.
- Unterstützung beider GitLab‑Schnittstellen.

Deliverables:
- `app/api/gitlab/rest/[...path]/route.ts`: Whitelist‑basierter Pass‑Through, Query/Headers‑Sanitizing, Error‑Mapping.
- `app/api/gitlab/graphql/route.ts`: POST mit `query`/`variables`, Validierung (Zod), PAT‑Injection im Header.
- Hilfs‑Lib: Fetch‑Wrapper mit Retry/Backoff (429/5xx), ETag/`If-None-Match` Support (optional kurzzeitiger in‑memory Cache, pro Instanz, ohne Persistenz).

Erfolgskriterien:
- Beispielaufrufe (User/Projects) funktionieren stabil; Ratenlimits werden abgefedert.

---

### Phase 3 – Datenmodell & erste Read‑Views (MVP, Boards‑first)
Ziele:
- Lesende Übersichten für: Gruppen/Projekte, Epics, Issues, Labels, Milestones, Beziehungen (Issue↔Epic, Issue↔Issue).
- Startansicht als Board statt Tabelle.

Deliverables:
- TS‑Types für Kernobjekte (vereinheitlicht zwischen REST und GraphQL, minimal für Start).
- Repositories: `getProjects`, `getEpics(groupId|projectId)`, `getIssues(projectId, filters)`, `getIssueLinks(issueId)`.
- Board‑UI (Read‑only): Spaltenlogik zunächst simpel (z. B. `opened` Status + optionale Workflow‑Labels „Backlog/Doing/Review/Done“), Karten zeigen Titel, Assignee, Labels, Weight, Epic.
- Schnelle Filter: Projekt/Label/Assignee; Suchfeld; Paginierung/Lazy‑Load.

Erfolgskriterien:
- Board lädt live Daten nach Login; Wechsel des Projekts/Filters ist flüssig.

---

### Phase 4 – Abhängigkeiten & Visualisierung
Ziele:
- Darstellung von Abhängigkeiten und Hierarchien, ohne Mutationen.

Deliverables:
- „Relations“-Panel je Issue (eingehend/ausgehend), Epics → Issues → Sub‑Issues (sofern aktiviert).
- Graph‑Ansicht (leichtgewichtig): `d3`/`dagre`/`vis-network` zur Darstellung von Issue‑Links; Fokus auf Performance bei mittelgroßen Mengen (Deduplikation, progressive Loading).
- Einfache Kennzahlen: z. B. Count offen/geschlossen pro Epic, Summe Weight pro Spalte.

Erfolgskriterien:
- Mindestens eine Graph‑Ansicht nutzbar; Navigieren von Knoten zu Issue‑Detailansicht im Dashboard.

---

### Phase 5 – Robustheit, Sicherheit, Performance
Ziele:
- Härtung des Proxy, anständige Fehlermeldungen, Logging ohne Geheimnisse.

Deliverables:
- Request‑Validierung (Zod), Input‑Größenlimits.
- Retry/Backoff, simples Circuit‑Breaker (pro Host/Route) bei wiederholten 5xx.
- Structured Logging (Pino) mit Redaction (Auth‑Header, Cookies, PII), konsistente Fehlercodes.
- Security Headers (Middleware), CSP‑Baseline; optional Sentry nur client‑seitig ohne Token.

Erfolgskriterien:
- Gleichzeitige Zugriffe (z. B. 5–10 parallele) stabil; Fehler werden sauber angezeigt.

---

### Phase 6 – UI/UX Feinschliff (Desktop)
Ziele:
- Produktive Nutzung: schnelle Navigation, sinnvolle Defaults.

Deliverables:
- Tastatur‑Shortcuts (z. B. „/“ für Suche), Command Palette (`cmdk`) für schnelle Filterwechsel.
- Settings lokal (LocalStorage): Theme, Board‑Spalten, Kartenfelder.
- Ladeindikatoren, leere Zustände, hilfreiche Tooltips.

Erfolgskriterien:
- Flotter Workflow, keine unnötigen Klicks, gutes Feedback.

---

### Phase 7 – Docker & CapRover
Ziele:
- Reproduzierbares Image mit Node 24, CapRover‑kompatibel.

Deliverables:
- `Dockerfile` (mehrstufig, Node 24):
    - Builder: `node:24-alpine` → `npm ci` → `next build`
    - Runner: `node:24-alpine` → nur Runtime‑Files, `next start` auf `PORT`
- `captain-definition` oder Doku für CapRover Deploy (App erstellen, Env setzen, Image pushen/Deploy aus Repo).
- README Deploy‑Abschnitt: notwendige Env‑Variablen, Security‑Hinweise (HTTPS, Cookie Secure, ENCRYPTION_SECRET setzen).

Erfolgskriterien:
- App läuft hinter CapRover; Login mit PAT klappt; API‑Proxy erreichbar.

---

### Phase 8 – QA & Docs
Ziele:
- Basis‑Qualitätssicherung und Doku, ohne Overhead.

Deliverables:
- Smoke‑E2E (Playwright): Login → Board‑Laden → Relation‑Graph öffnen → Logout.
- `/api/health` Endpoint (keine Secrets), einfache Readme mit Setup/Deploy, Hinweis zu PAT‑Scopes.

Erfolgskriterien:
- E2E grün; Healthcheck grün in CapRover.

---

### Technische Leitplanken (aktualisiert)
- Auth: Kein OAuth. PAT‑Login; PAT ausschließlich im httpOnly Secure Cookie, verschlüsselt (z. B. `iron-seal` oder AES‑GCM). Niemals an Client‑JS weitergeben.
- API: Alle GitLab‑Calls über serverseitige Route Handlers. Host‑Whitelist gegen SSRF.
- Daten: Kein Persistenz‑Store. Optional kurzer in‑memory Cache (pro Instanz) mit ETag/`Cache-Control` Respekt.
- UI: Boards als Startansicht; Tabellen optional später. Graph‑View für Dependencies.
- Tooling: Tailwind v4, Radix UI für zugängliche Komponenten, TanStack Query für client‑seitige Re‑Fetches.
- Node/Next: Node 24, Next 16; Docker auf `node:24-alpine`.

---

### Offene Punkte (kurz klären, bevor wir starten)
1) Board‑Spaltenlogik: Sollen die Spalten anfangs auf Workflow‑Labels („Backlog/Doing/Review/Done“) basieren, oder schlicht `opened/closed`? Wenn Workflow‑Labels: Welche Labelnamen nutzt ihr aktuell?
2) Scope des Boards: Zunächst ein einzelnes Projekt pro Board (umschaltbar), oder direkt gruppenübergreifend?
3) PAT‑Scopes: Für Read‑only empfehle ich mindestens `read_api`. Bestätigst du das? (Falls Epics: je nach Edition/Scope ggf. zusätzlich notwendig, aber meist `read_api` ausreichend.)

---

### Nächster Schritt
- Deine Antworten zu den 3 Punkten oben. Danach setze ich Phase 0–2 um (PAT‑Login, Proxy, Basislayout) und liefere `.env.example` + Dockerfile (Node 24, CapRover‑ready).