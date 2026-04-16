// Page transition handler
document.addEventListener('DOMContentLoaded', () => {
    // Check if we should show the intro video
    if (!sessionStorage.getItem('introShown') && window.location.pathname.endsWith('index.html')) {
        window.location.href = 'intro-video.html';
        return;
    }

    // Set up loading screen for all pages except the intro
    if (!window.location.pathname.includes('intro-video.html') && !document.querySelector('.loading-screen')) {
        window.loadingScreen = new LoadingScreen();
    }

    // Handle back/forward navigation
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && loadingScreen) {
            loadingScreen.hide();
        }
    });
});

// Handle page transitions
function handlePageTransition(event) {
    const target = event.currentTarget;
    const href = target.getAttribute('href');
    
    // Only handle internal links
    if (href && !href.startsWith('#') && 
        !href.startsWith('http') && 
        !href.startsWith('mailto:') && 
        !target.getAttribute('target') &&
        !event.ctrlKey && 
        !event.metaKey) {
        
        event.preventDefault();
        
        // Show loading screen
        if (window.loadingScreen) {
            loadingScreen.show();
        }
        
        // Navigate after a short delay to allow the loading screen to show
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    }
}

// Add click handlers to all internal links
document.addEventListener('click', (event) => {
    let target = event.target;
    
    // Find the nearest anchor element
    while (target && target.tagName !== 'A') {
        target = target.parentNode;
        if (target === document.body) return;
    }
    
    if (target && target.tagName === 'A') {
        handlePageTransition({ currentTarget: target, ...event });
    }
}, true);
