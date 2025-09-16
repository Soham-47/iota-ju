(function() {
  'use strict';

  // Get the HTML element
  const htmlEl = document.documentElement;
  
  // Function to remove the loader and show the page
  const showPage = () => {
    // Remove loading class from HTML element
    htmlEl.classList.remove('is-loading');
    
    // Remove the loader element if it exists
    const loader = document.querySelector('.app-loader');
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
    
    // Make sure body is visible
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    
    // Mark as shown for this session
    sessionStorage.setItem('appLoaderShown', '1');
  };

  // Check if we should skip the loader
  if (sessionStorage.getItem('appLoaderShown') === '1') {
    showPage();
    return;
  }

  // Add loading class to HTML element
  htmlEl.classList.add('is-loading');
  
  // Make sure body is hidden initially
  document.body.style.visibility = 'hidden';
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease-in-out';

  // Create loader element
  const loader = document.createElement('div');
  loader.className = 'app-loader';
  
  // Use absolute path for the logo to ensure it works across all pages
  const logoPath = window.location.pathname.includes('iota-ju') 
    ? '/iota-ju/ABOUT US/images/logo.png' 
    : '/ABOUT US/images/logo.png';
  
  // Set up loader HTML
  loader.innerHTML = `
    <div class="loader-box">
      <img class="loader-logo" src="${logoPath}" alt="IOTA" onerror="this.style.display='none'" />
      <div class="progress-track">
        <div class="progress-bar" id="app-progress"></div>
      </div>
      <div class="progress-text" id="app-progress-text">0%</div>
    </div>
  `;
  
  // Add loader to the page
  document.body.insertBefore(loader, document.body.firstChild);
  
  // Get DOM elements
  const bar = document.getElementById('app-progress');
  const txt = document.getElementById('app-progress-text');
  let current = 0;
  let loadingComplete = false;
  let animationFrameId = null;

  // Update progress display
  const render = () => {
    if (!bar || !txt) return;
    const p = Math.min(100, Math.floor(current));
    bar.style.width = p + '%';
    txt.textContent = p + '%';
  };

  // Smooth progress animation
  const tick = (timestamp) => {
    if (current < 90 && !loadingComplete) {
      current += Math.max(0.5, (100 - current) * 0.03);
      render();
      animationFrameId = requestAnimationFrame(tick);
    }
  };

  // Handle page load completion
  const handleLoadComplete = () => {
    if (loadingComplete) return;
    loadingComplete = true;
    
    // Cancel any pending animation frames
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Animate to 100%
    const start = current;
    const duration = 500; // ms
    const startTime = performance.now();

    const finish = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      current = start + (100 - start) * progress;
      render();
      
      if (progress < 1) {
        requestAnimationFrame(finish);
      } else {
        // Show the page and hide the loader
        showPage();
      }
    };
    
    requestAnimationFrame(finish);
  };

  // Start the initial progress animation
  animationFrameId = requestAnimationFrame(tick);

  // Set up event listeners
  const bindEvents = () => {
    // Check if page is already loaded
    if (document.readyState === 'complete') {
      handleLoadComplete();
    } else {
      window.addEventListener('load', handleLoadComplete);
      // Fallback in case load event doesn't fire
      setTimeout(handleLoadComplete, 10000);
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });
  };

  // Initialize
  bindEvents();
})();


