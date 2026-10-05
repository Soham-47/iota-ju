# Frontend transition and site-quality plan

**Status:** Proposed plan; no framework migration has started.
**Priority constraint:** The site must be presentable tomorrow (October 7, 2026).
**Current baseline:** main at aa3eb38 (PR #9 merge).

## Goal

Keep tomorrow's presentation safe, then replace the current hand-maintained static pages with a maintainable, data-driven frontend while preserving working public URLs and the current static hosting model. Audit all routes, links, images, video, and page content as part of the transition. Remove files only after proving they are unused.

## Current findings

- The public site is plain HTML/CSS/JavaScript: approximately 36 HTML pages, 16 CSS files, and 12 JavaScript files under frontend/.
- There is no frontend framework. frontend/package.json has no application dependencies, and its build script is a placeholder.
- index.html redirects to frontend/index.html; that page adds first-visit/session routing through Intro and Home.
- Root vercel.json, frontend/vercel.json, frontend/_redirects, frontend/public/_redirects, and a nested Netlify config all affect routing or deployment. Confirm the active project root before changing deployment behavior.
- Pages duplicate images and videos across section folders. Several media files are large; one tracked team image is empty. These need reference and content checks before any deletion or replacement.
- The root README is UTF-16 and describes the older layout and hosting setup. Refresh it after the new build/deploy commands are known.
- The Drone Workshop Q&A portal is a separate FastAPI service. Do not migrate its runtime as part of the public frontend conversion.

## Recommended approach

Use **Astro** for the public, content-led website, with small interactive islands only where a page needs them. Keep content in validated local data/Markdown at first so the site can be reviewed in Git and built/deployed as static files. Keep the existing Python Q&A backend separate.

This fits the current site better than rewriting every page as a client-rendered React application: the bulk of the site is public information and media, while only galleries, filters, and menus need client-side behavior. Astro describes its islands approach as static HTML with JavaScript loaded for the interactive pieces ([Astro Islands](https://docs.astro.build/en/concepts/islands/)). Astro static output can deploy to Vercel without extra configuration ([Astro on Vercel](https://docs.astro.build/en/guides/deploy/vercel/)).

Next.js remains a reasonable option if the site becomes primarily server-rendered or needs server-side application features. Its static export is also deployable to static hosting, but server-only features are not available in that mode ([Next.js static exports](https://nextjs.org/docs/pages/guides/static-exports)). Avoid choosing a server runtime until a real site feature requires one.

**Meaning of “dynamic” for this plan:** pages and routes should be generated from structured content, and interactions should work without duplicating page markup. Updating content will initially require a reviewable content change and deploy. Editing content without a deploy requires a later CMS decision; live registration/authentication requires a secured backend and is outside this public-page migration.

## Target shape

- frontend/src/pages/ — Astro route files
- frontend/src/layouts/ — shared page shell and metadata
- frontend/src/components/ — reusable navigation, cards, galleries
- frontend/src/content/ — events, projects, people, timeline data
- frontend/src/styles/ — shared design tokens and global styles
- frontend/public/legacy/ — old pages/assets during route-by-route migration
- frontend/public/media/ — optimized shared images, video, documents

Keep the Q&A portal and any future registration backend in their existing service areas. Move legacy files only when a route is migrated and its inbound links/redirects are accounted for. The exact layout can change if the Astro pilot shows a simpler path, but public routes and content ownership must remain explicit.

## Ticket-by-ticket plan

### Phase 0 — presentation safety (before October 7)

#### WEB-001: Freeze and preflight the current presentation routes

**Description:** Use the deployed main site as the presentation baseline. Check the home/intro path and the specific pages expected in the presentation before attempting a framework cutover.

**Acceptance criteria**
- [ ] Root, intro, home, events, projects, and team routes load from the current deployment.
- [ ] The presentation path works on a phone-sized viewport and a desktop viewport.
- [ ] Any presentation-blocking broken link/media is recorded and fixed with a small isolated patch.

**Verification:** Open the actual deployed preview/production URLs, follow the presentation path, and inspect browser/network errors for the chosen pages. Keep the current deployment as the fallback.

**Dependencies:** None. **Scope:** M.

### Phase 1 — prove the framework and hosting seam

#### WEB-002: Inventory current public routes and deployment behavior

**Description:** Make an authoritative route table for every live page, redirects, section entry points, and asset roots. Identify which Vercel/Netlify configuration is actually active.

**Acceptance criteria**
- [ ] Every current page has an intended preserved route or a documented replacement.
- [ ] The root redirect, intro/session behavior, nested routes, and space/case-sensitive paths are recorded.
- [ ] The production and preview build roots and output directories are confirmed.

**Verification:** Compare the route table against the deployed site and hosting dashboard/configuration. Do not change redirects in this ticket.

**Dependencies:** WEB-001. **Scope:** M.

#### WEB-003: Add an Astro pilot without switching production

**Description:** Add Astro to the frontend and migrate one representative, low-risk page (preferably Projects or Timeline) into a shared layout. Keep the existing deployment and page routes available while the pilot is evaluated.

**Acceptance criteria**
- [ ] The Astro page builds to static HTML and uses one shared layout/component.
- [ ] Existing CSS and one image/video are reused without broken path behavior.
- [ ] The deployed preview is visually acceptable on desktop and mobile; production still serves the old site.

**Verification:** Add explicit dev/build/preview scripts, run the production build, then inspect the pilot route and asset requests on a preview deployment.

**Dependencies:** WEB-002. **Scope:** M.

#### WEB-004: Approve route and content conventions

**Description:** Based on the pilot, settle URL naming, legacy route mapping, content formats, asset locations, and the boundary between static pages and server-backed features.

**Acceptance criteria**
- [ ] Route and redirect conventions are documented in the repository.
- [ ] Events, projects, timeline entries, and people each have a simple validated content shape.
- [ ] The Astro pilot passes the same static hosting setup intended for production.

**Verification:** Review the conventions against current inbound links and at least one migrated page per content type before migrating the rest.

**Dependencies:** WEB-003. **Scope:** S.

### Phase 2 — migrate in small visible slices

#### WEB-005: Build the shared site shell and navigation

**Description:** Create the common layout, metadata, responsive navigation/footer, and design tokens; migrate the global shell while preserving route behavior.

**Acceptance criteria**
- [ ] Shared navigation and footer are implemented once and work across migrated pages.
- [ ] Keyboard focus, active page state, mobile menu, and page titles are correct.
- [ ] Legacy pages still load with their existing navigation until individually migrated.

**Verification:** Check one page from each section and test keyboard and mobile navigation.

**Dependencies:** WEB-004. **Scope:** M.

#### WEB-006: Move events and projects to structured content

**Description:** Represent event/project details as reviewed data and generate listing/detail pages from that data. Keep image, report, and video paths with each record.

**Acceptance criteria**
- [ ] Event/project cards and detail pages are generated from one source of truth per item.
- [ ] Each record validates required title, status/date, description, and media references.
- [ ] No registration flow is advertised as working unless its production endpoint is verified.

**Verification:** Build the site and verify every generated detail route, linked report, poster, gallery image, video, and CTA.

**Dependencies:** WEB-005. **Scope:** L.

#### WEB-007: Migrate team, alumni, and timeline content

**Description:** Move member/alumni/timeline records to structured content and shared cards while checking identity, role, year, links, and consent to publish personal contact details.

**Acceptance criteria**
- [ ] No duplicate or placeholder people/cards are introduced.
- [ ] Portraits have correct names/alt text; links use valid absolute URLs or mailto links.
- [ ] Changes to a person or timeline entry do not require editing repeated page markup.

**Verification:** Review the rendered pages against an approved current roster and check all profile links and images.

**Dependencies:** WEB-005. **Scope:** L.

#### WEB-008: Add only needed interactive islands

**Description:** Replace page-specific scripts for shared interactions (mobile nav, galleries, filtering) with isolated components. Keep text and core page content available without JavaScript.

**Acceptance criteria**
- [ ] Each island corresponds to an observed interaction, not a speculative feature.
- [ ] Non-interactive page content renders as HTML without client hydration.
- [ ] Controls support keyboard and touch and respect reduced-motion settings.

**Verification:** Test each interaction with JavaScript enabled, keyboard-only navigation, touch-sized viewport, and reduced motion.

**Dependencies:** WEB-005; can proceed alongside WEB-006/007 after component conventions exist. **Scope:** M.

### Phase 3 — quality, cleanup, and cutover

#### WEB-009: Audit routes and media references

**Description:** Scan local links, image/video/document sources, CSS references, and redirects across the migrated and legacy site; repair confirmed broken references and outdated claims.

**Acceptance criteria**
- [ ] Every internal link resolves to a page or intentional redirect.
- [ ] Every local media reference exists and can be requested from the deployed route.
- [ ] Dates/statuses and public claims are reviewed by an owner; unknown facts are flagged, not guessed.

**Verification:** Run a repeatable link/asset check in CI and manually verify media playback and key external links in preview.

**Dependencies:** WEB-002; run continuously during WEB-006/007 and complete before cutover. **Scope:** L.

#### WEB-010: Optimize and deduplicate media safely

**Description:** Compare duplicate asset hashes, file references, dimensions, and formats. Compress or convert large media where quality and browser support permit; remove only proven unused copies.

**Acceptance criteria**
- [ ] Each deletion has zero live references and no deployment/service use.
- [ ] Required source assets and PDFs remain available; optimized replacements are visually/playback checked.
- [ ] The heaviest page payloads are reduced and documented with before/after measurements.

**Verification:** Check every affected page in preview and compare file sizes and network payloads.

**Dependencies:** WEB-009. **Scope:** M.

#### WEB-011: Cut over hosting only after parity

**Description:** Configure the actual production host to build the Astro app and serve its output. Keep redirects for old URLs and preserve the rollback path until the new deployment is verified.

**Acceptance criteria**
- [ ] Preview build succeeds from a clean install with the production build command.
- [ ] All route, link, media, and mobile checks pass against preview.
- [ ] Production routing can be rolled back without restoring deleted content or infrastructure.

**Verification:** Promote only after the presentation owner signs off on parity; then check root, deep links, 404 behavior, redirects, and media on production.

**Dependencies:** WEB-006, WEB-007, WEB-008, WEB-009. **Scope:** M.

#### WEB-012: Remove verified dead files and refresh onboarding docs

**Description:** After cutover, remove obsolete experiments, confirmed unreferenced files, conflicting deployment configs, and stale instructions; rewrite the README for the final architecture.

**Acceptance criteria**
- [ ] Every removed file is shown to be unreferenced and outside active services.
- [ ] There is one documented production build/deploy path.
- [ ] README covers setup, commands, architecture, route/content editing, deployment, and backend separation.

**Verification:** Clean clone → install → build → preview smoke check. Review the deletion list and deployment config with the site owner.

**Dependencies:** WEB-011. **Scope:** M.

## Checkpoints

- **Presentation checkpoint:** Current main remains deployable and the presentation pages work; no rushed framework cutover.
- **Framework checkpoint:** Astro pilot builds and deploys to preview while current production remains intact.
- **Content checkpoint:** Generated events/projects/people routes match approved content and preserve inbound URLs.
- **Cutover checkpoint:** Link/media checks, responsive review, production preview, and rollback path are complete.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rushed migration breaks tomorrow's presentation | High | Keep production on current main; do only the preflight before the presentation |
| Existing relative URLs break during file moves | High | Capture routes first; preserve legacy URL paths and add explicit redirects |
| “Dynamic” is mistaken for live CMS editing | Medium | Start with structured content and generated routes; make CMS a separate decision |
| Large/duplicate media drives slow builds and pages | Medium | Measure, hash, and optimize after link usage is mapped |
| Public member data is published without approval | High | Confirm contact/portrait consent; do not infer permission from a file being present |
| Public site migration entangles a separate FastAPI service | High | Keep the Q&A portal and any real registration backend isolated |

## Open decisions

- Which routes/pages will be shown tomorrow? WEB-001 assumes Home, Events, Projects, and Team unless the presenter supplies a different route list.
- Does “dynamic” mean content can be updated without a code deploy? This plan assumes no; if yes, choose a CMS before WEB-006.
- Who approves current event dates/statuses and member contact details before publication?
