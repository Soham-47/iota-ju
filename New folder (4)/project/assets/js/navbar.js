/**
 * Shared Navbar Injector
 * - Injects a consistent navbar into pages that include this script
 * - Requires the page to include assets/css/navbar.css
 */
(function() {
  const NAV_HTML = `
  <nav>
    <a href="{BASE}/index.html" class="logo-section" aria-label="Go to Home">
      <div class="logo">
        <img src="{BASE}/ABOUT US/images/logo.png" alt="IOTA Logo" class="logo-img" />
      </div>
      <div class="separator" aria-hidden="true"></div>
      <div class="logo">
        <img src="{BASE}/ABOUT US/images/JULogo.png" alt="Jadavpur University Logo" class="logo-img" />
      </div>
    </a>
    <button class="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="main-navigation">
      <span class="menu-icon">☰</span>
      <span class="sr-only">Menu</span>
    </button>
    <div class="routes" id="main-navigation" role="navigation" aria-label="Main">
      <a href="{BASE}/HOME/homepage-of-iota-main/home.html" class="nav-link"><span class="link-text">Home</span></a>
      <a href="{BASE}/EVENTS (2)/views/events.html" class="nav-link"><span class="link-text">Events</span></a>
      <a href="{BASE}/PROJECTS/projects.html" class="nav-link"><span class="link-text">Projects</span></a>
      <a href="{BASE}/TEAM/team.html" class="nav-link"><span class="link-text">Team</span></a>
      <a href="{BASE}/ABOUT US/about us.html" class="nav-link"><span class="link-text">About Us</span></a>
    </div>
  </nav>`;

  function resolveBase(pathname) {
    // Always resolve relative to repo root at 'iota-ju'
    const parts = pathname.replace(/\\/g, '/').split('/');
    const idx = parts.lastIndexOf('iota-ju');
    if (idx !== -1) {
      const depth = parts.length - (idx + 1) - 1; // exclude file
      return Array(depth).fill('..').join('/') || '.';
    }
    // Fallbacks for direct file viewing
    if (pathname.includes('/ABOUT US/')) return '..';
    if (pathname.includes('/HOME/')) return '..';
    if (pathname.includes('/EVENTS (2)/')) return '..';
    if (pathname.includes('/PROJECTS/')) return '..';
    if (pathname.includes('/TEAM/')) return '..';
    return '.';
  }

  function buildNav() {
    const base = resolveBase(window.location.pathname.replace(/\\/g, '/'));
    const html = NAV_HTML.replaceAll('{BASE}', base);
    const container = document.createElement('div');
    container.innerHTML = html;
    const nav = container.firstElementChild;
    const existing = document.querySelector('nav');
    if (existing) {
      existing.replaceWith(nav);
    } else {
      document.body.prepend(nav);
    }
    return nav;
  }

  function initBehavior(nav) {
    const menuToggle = nav.querySelector('.menu-toggle');
    const navMenu = nav.querySelector('.routes');

    const updateHeader = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 50) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };

    const toggleMenu = (show = null) => {
      const willShow = show !== null ? show : menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', willShow);
      document.documentElement.classList.toggle('menu-open', willShow);
      if (willShow) {
        document.body.style.overflow = 'hidden';
        navMenu.classList.add('active');
      } else {
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    menuToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 992 && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        toggleMenu(false);
      }
    });
    window.addEventListener('scroll', updateHeader);
    updateHeader();

    // active link marking
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    nav.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      const a = document.createElement('a');
      a.href = href;
      const resolved = a.pathname.replace(/\\/g, '/');
      if (currentPath.endsWith(resolved)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      link.addEventListener('click', () => { if (window.innerWidth <= 992) toggleMenu(false); });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    const nav = buildNav();
    initBehavior(nav);
  });
})();


