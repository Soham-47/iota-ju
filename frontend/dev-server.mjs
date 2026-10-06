import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(frontendDir, '..');
const port = Number(process.env.PORT || 4173);

const cleanPages = new Map([
  ['/home', 'frontend/HOME/homepage-of-iota-main/home.html'],
  ['/intro', 'frontend/INTRO/intro.html'],
  ['/about', 'frontend/ABOUT US/about us.html'],
  ['/alumni', 'frontend/ALUMNI/alumni.html'],
  ['/timeline', 'frontend/TIMELINE/timeline.html'],
  ['/team', 'frontend/team/team.html'],
  ['/projects', 'frontend/projects/projects.html'],
  ['/events', 'frontend/EVENTS (2)/views/events.html'],
  ['/events/drone-workshop', 'frontend/EVENTS (2)/views/droneWorkshop.html'],
  ['/events/iota-bidwars', 'frontend/EVENTS (2)/views/iotaBidwars.html'],
  ['/events/lord-of-the-ring', 'frontend/EVENTS (2)/views/lordOfTheRings.html'],
  ['/events/lord-of-the-rings', 'frontend/EVENTS (2)/views/lordOfRings.html'],
  ['/events/connexion', 'frontend/EVENTS (2)/views/connexion.html'],
  ['/events/innovatia', 'frontend/EVENTS (2)/views/innovatia.html'],
  ['/events/lord-of-the-rings-2025', 'frontend/EVENTS (2)/views/lordOfRings25.html'],
  ['/events/automotive-electronics-seminar', 'frontend/EVENTS (2)/views/seminarAutomotiveElectronics.html'],
]);

const legacyPrefixes = new Map([
  ['/ABOUT US/', '/frontend/ABOUT US/'],
  ['/ALUMNI/', '/frontend/ALUMNI/'],
  ['/EVENTS (2)/', '/frontend/EVENTS (2)/'],
  ['/HOME/', '/frontend/HOME/'],
  ['/INTRO/', '/frontend/INTRO/'],
  ['/TIMELINE/', '/frontend/TIMELINE/'],
  ['/team/', '/frontend/team/'],
  ['/projects/', '/frontend/projects/'],
  ['/assets/', '/frontend/assets/'],
  ['/drone-workshop/', '/frontend/drone-workshop/'],
]);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(relativePath) {
  const candidate = path.resolve(siteRoot, relativePath.replace(/^\/+/, ''));
  return candidate === siteRoot || candidate.startsWith(`${siteRoot}${path.sep}`) ? candidate : null;
}

function requestFile(pathname) {
  if (pathname === '/') return safePath('index.html');
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (cleanPages.has(cleanPath)) return safePath(cleanPages.get(cleanPath));

  const projectMatch = cleanPath.match(/^\/project\/([a-z0-9-]+)$/i);
  if (projectMatch) return safePath(`frontend/projects/project-details/${projectMatch[1]}.html`);

  for (const [prefix, replacement] of legacyPrefixes) {
    if (pathname.startsWith(prefix)) return safePath(`${replacement}${pathname.slice(prefix.length)}`);
  }

  return safePath(pathname);
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = requestFile(pathname);
    if (filePath) {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) filePath = safePath(path.join(pathname, 'index.html'));
    }
    const body = filePath && await fs.readFile(filePath);
    if (!body) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    if (request.method === 'GET') response.end(body);
    else response.end();
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, () => console.log(`IOTA site: http://localhost:${port}`));
