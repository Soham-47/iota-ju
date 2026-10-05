# Repository guide

## What this repository contains

IOTA JU is Jadavpur University's IoT Applications Club website. The public site is currently a multi-page collection of plain HTML, CSS, and JavaScript files. It has no frontend framework or real build step yet.

The main site lives under frontend/. Separate tools and services (such as the Drone Workshop Q&A portal) live inside that tree and have their own deployment/runtime needs. Do not assume that the public site and those services share one backend.

## Start here

- index.html redirects to frontend/index.html.
- frontend/index.html routes first-time visitors through frontend/INTRO/intro.html, then to frontend/HOME/homepage-of-iota-main/home.html.
- Main public sections: frontend/EVENTS (2)/, frontend/projects/, frontend/team/, frontend/ALUMNI/, frontend/TIMELINE/, and frontend/ABOUT US/.
- Shared navigation and loader code: frontend/assets/ and frontend/loading-screen.*.
- Root deployment configuration: vercel.json. There is also a frontend/vercel.json; check the deployed project's configured root before changing either.
- The frontend package is frontend/package.json. Its current build command is a placeholder; it does not compile or validate the site.
- frontend/drone-workshop/qa-portal/ has its own FastAPI backend, frontend, Dockerfile, and deployment guide. Keep its runtime and deployment concerns separate from the public pages unless a task explicitly changes them.

## Working rules

1. Read the target page, its linked styles/scripts, and the relevant hosting rules before changing routes or assets.
2. Preserve public URLs during migration. Many current links use relative paths, spaces, capitalization, and nested folders; static hosts treat capitalization as significant.
3. Do not delete or rename media based only on its filename or apparent duplication. Search references and compare file contents first; remove it only after confirming no live page, redirect, deployment, or service uses it.
4. Keep the public site content-first. Use the smallest amount of client JavaScript needed for interactions. Keep separate backends separate.
5. Never commit secrets, environment files, real registration records, payment references, or uploaded payment screenshots. User-submitted data must not live in publicly served static folders.
6. Do not add a dependency or introduce a new application layer without a concrete task that needs it.
7. Keep content accurate: confirm current event dates/statuses, member roles, contact links, and project claims with the responsible source before publishing.
8. When a task changes links or media, verify the final rendered URL and file path, including case and URL encoding. For UI work, also check mobile layout, keyboard use, and meaningful image alt text.
9. Check git status before and after work. Do not overwrite uncommitted user files.

## Current commands and limits

From the repository root:

- npm --prefix frontend start serves the existing static frontend locally.
- npm --prefix frontend run build currently prints a placeholder message; it is not a production build or quality check.
- There is no root test or lint script today.

The deployment plan must replace these instructions when the Astro build is introduced. Do not claim the site is production-ready based only on the current placeholder build command or a static preview deployment.

## Definition of done

- Existing public routes still resolve, or have an intentional redirect.
- Changed links and media resolve from the deployed page, not just from the local filesystem.
- No broken or placeholder content is introduced.
- Desktop and mobile layouts remain usable; interactive controls work with keyboard and pointer.
- The actual production build succeeds and the relevant preview pages have been checked before changing production routing.
