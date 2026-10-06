# IOTA JU Website

The official website for IOTA JU, the IoT Applications Club at Jadavpur University. It presents the club, its projects and events, and its current and former members.

The public site is currently a static HTML, CSS, and JavaScript website. The separate Drone Workshop Q&A portal includes a Python/FastAPI backend and is documented independently.

## Contents

- [Project structure](#project-structure)
- [Run the website locally](#run-the-website-locally)
- [Update site content](#update-site-content)
- [Media and performance](#media-and-performance)
- [Deployment](#deployment)
- [Drone Workshop Q&A portal](#drone-workshop-qa-portal)
- [Engineering notes](#engineering-notes)

## Project structure

```text
.
├── index.html                   # Root redirect to the frontend site
├── vercel.json                  # Root hosting routes and redirects
├── AGENTS.md                    # Repository guidance for contributors and coding agents
├── tasks/
│   ├── plan.md                  # Proposed frontend transition plan and ticket breakdown
│   └── todo.md                  # Migration checklist
└── frontend/
    ├── index.html               # Site entry and intro/home routing
    ├── HOME/                    # Homepage
    ├── INTRO/                   # Intro experience
    ├── ABOUT US/                # About page and its media
    ├── EVENTS (2)/              # Event listing and event detail pages
    ├── projects/                # Project listing, details, and media
    ├── team/                    # Team page and portraits
    ├── ALUMNI/                  # Alumni page
    ├── TIMELINE/                # Club timeline
    ├── assets/                  # Shared styles and scripts
    └── drone-workshop/qa-portal/ # Separate workshop Q&A application
```

The folders under `frontend/` are a static site, not a framework application. Some folder and file names contain spaces or legacy suffixes; preserve their exact spelling and capitalization when linking to them.

## Run the website locally

Use the dependency-free local runner from the repository root. It serves the actual HTTP aliases (`/home`, `/events`, `/project/drone`, and so on) as well as legacy file paths:

```bash
npm --prefix frontend start
```

Then open <http://localhost:4173/>. To open a page directly, use a clean route, for example:

- <http://localhost:4173/home>
- <http://localhost:4173/events>
- <http://localhost:4173/projects>

Do not open pages with a `file://` URL when checking them in a browser; root-relative resources and clean routes only work over HTTP.

## Update site content

- **Homepage:** edit `frontend/HOME/homepage-of-iota-main/home.html` and its nearby assets.
- **Events:** update the listing and relevant detail pages in `frontend/EVENTS (2)/views/`.
- **Projects:** update `frontend/projects/projects.html`, detail pages in `frontend/projects/project-details/`, and referenced files in `images/` or `media/`.
- **Team and alumni:** update `frontend/team/` and `frontend/ALUMNI/` respectively. Keep names, roles, portrait alt text, and profile links accurate.
- **Timeline:** update `frontend/TIMELINE/`.
- **Shared navigation:** styles and scripts live in `frontend/assets/`.

Keep paths relative to each HTML file where the site already uses relative links. For a new asset, check its size and format, use descriptive alt text for meaningful images, and verify it loads from the served local site. Avoid publishing personal contact details unless they are intended for the public site.

## Media and performance

The site includes large photos and video. Use native image lazy loading for offscreen images and defer below-the-fold video where possible. Keep the initial viewport lightweight, provide video posters, and avoid autoplaying multiple videos at once. Compress media when visual quality permits, and confirm its references before removing or replacing any file.

The repository has not yet been fully migrated to an image CDN or a frontend framework. Moving frameworks by itself does not guarantee faster page loads; payload size, loading strategy, caching, and hosting determine most of the result. The migration proposal is in [`tasks/plan.md`](tasks/plan.md).

## Deployment

The public website is configured for static hosting. The repository contains root and frontend hosting configuration files; the active hosting project and its configured root directory should be confirmed before changing deployment settings. `vercel.json` at the repository root handles redirects and routes, while `frontend/vercel.json`, `_redirects`, and `.htaccess` support other hosting setups or legacy paths.

For a Vercel deployment connected to this repository, use the repository root unless the Vercel project is already configured with a different root. Review the route behavior after any hosting configuration change, especially the root redirect and deep links with spaces or mixed capitalization. There is no frontend compilation/build step today; `frontend/package.json` has a placeholder build script.

## Drone Workshop Q&A portal

The workshop Q&A portal is a separate application under `frontend/drone-workshop/qa-portal/`. Its backend uses Python/FastAPI and has its own dependencies and deployment requirements. Follow its [deployment guide](frontend/drone-workshop/qa-portal/DEPLOYMENT.md) and [backend requirements](frontend/drone-workshop/qa-portal/backend/requirements.txt); do not treat it as part of the static website’s frontend deployment.

Keep backend secrets in environment variables and out of Git. Local backend setup and runtime details should follow the portal’s own documentation.

## Engineering notes

- Read [`AGENTS.md`](AGENTS.md) before making broad repository changes.
- The site is still being maintained as a static website. The Astro/framework transition is a proposal, not an implemented migration; see [`tasks/plan.md`](tasks/plan.md) and [`tasks/todo.md`](tasks/todo.md).
- Preserve public URLs and existing links while reorganizing pages or assets. Check hosting rewrites and redirects together with file changes.
- Before merging site changes, review the affected pages at mobile and desktop widths and verify local links and media references.
