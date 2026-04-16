/**
 * Site Preloader
 * Prefetches key pages and assets in the background to ensure instant navigation.
 */

(function () {
    // Wait for the main page to load completely before starting preloading
    window.addEventListener('load', () => {
        // Delay preloading slightly to prioritize critical rendering
        setTimeout(preloadSite, 2000);
    });

    function preloadSite() {
        const pagesToPreload = [
            '../HOME/homepage-of-iota-main/home.html',
            '../PROJECTS/projects.html',
            '../ABOUT US/about us.html',
            '../EVENTS (2)/views/events.html',
            '../TEAM/team.html'
        ];

        // Adjust paths based on current location
        const currentPath = window.location.pathname;
        const adjustedPaths = pagesToPreload.map(path => {
            // Simple path adjustment logic (can be improved based on directory structure)
            if (currentPath.includes('/HOME/')) return path.replace('../HOME/', './');
            if (currentPath.includes('/PROJECTS/')) return path.replace('../PROJECTS/', './');
            if (currentPath.includes('/ABOUT US/')) return path.replace('../ABOUT US/', './');
            if (currentPath.includes('/EVENTS (2)/')) return path.replace('../EVENTS (2)/', './');
            if (currentPath.includes('/TEAM/')) return path.replace('../TEAM/', './');
            return path; // Default relative path
        });

        adjustedPaths.forEach(url => {
            // Prefetch HTML
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);

            // Fetch the page to parse and preload its images
            fetch(url)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Preload images found in the page
                    const images = Array.from(doc.images);
                    images.forEach(img => {
                        if (img.src) {
                            const imgLink = document.createElement('link');
                            imgLink.rel = 'prefetch';
                            imgLink.href = img.src;
                            document.head.appendChild(imgLink);
                        }
                    });
                })
                .catch(err => console.log('Preload failed for:', url));
        });
    }
})();
