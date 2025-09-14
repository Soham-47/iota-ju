class LoadingScreen {
  constructor() {
    this.loadingScreen = null;
    this.progressBar = null;
    this.loadingText = null;
    this.assets = [];
    this.assetsLoaded = 0;
    this.minDisplayTime = 1000; // Minimum display time in ms
    this.startTime = Date.now();
    this.isTransitioning = false;
    this.init();
  }

  init() {
    // Create loading screen elements
    this.createLoadingScreen();
    
    // Start loading assets
    this.loadAssets();
    
    // Add event listeners
    window.addEventListener('load', () => this.onPageLoad());
    
    // Fallback in case load event doesn't fire
    setTimeout(() => this.onPageLoad(), 5000);
  }

  createLoadingScreen() {
    // Create loading screen element
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.className = 'loading-screen';
    
    // Create loader
    const loader = document.createElement('div');
    loader.className = 'loader';
    
    // Create text
    this.loadingText = document.createElement('div');
    this.loadingText.className = 'loading-text';
    this.loadingText.textContent = 'Loading...';
    
    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'loading-progress';
    
    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'loading-progress-bar';
    
    // Assemble the loading screen
    progressContainer.appendChild(this.progressBar);
    this.loadingScreen.appendChild(loader);
    this.loadingScreen.appendChild(this.loadingText);
    this.loadingScreen.appendChild(progressContainer);
    
    // Add to body
    document.body.prepend(this.loadingScreen);
    
    // Prevent scrolling while loading
    document.body.style.overflow = 'hidden';
  }

  loadAssets() {
    // Get all images, background images, and videos
    const images = Array.from(document.images);
    const videos = Array.from(document.querySelectorAll('video'));
    const elements = Array.from(document.querySelectorAll('*'));
    const bgImages = [];
    
    // Find elements with background images
    elements.forEach(el => {
      const bgImg = window.getComputedStyle(el).backgroundImage;
      if (bgImg && bgImg !== 'none') {
        const url = bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        if (url) {
          const img = new Image();
          img.src = url;
          bgImages.push(img);
        }
      }
    });
    
    // Combine all assets
    this.assets = [...images, ...videos, ...bgImages];
    
    // If no assets to load, update progress
    if (this.assets.length === 0) {
      this.updateProgress(100);
      return;
    }
    
    // Add load/error event listeners to all assets
    this.assets.forEach(asset => {
      if (asset.complete || asset.readyState >= 3) { // 3 = HAVE_FUTURE_DATA
        this.onAssetLoaded();
      } else {
        asset.addEventListener('load', () => this.onAssetLoaded());
        asset.addEventListener('error', () => this.onAssetLoaded());
        asset.addEventListener('canplaythrough', () => this.onAssetLoaded());
      }
    });
  }

  onAssetLoaded() {
    this.assetsLoaded++;
    const progress = Math.min(Math.round((this.assetsLoaded / this.assets.length) * 100), 100);
    this.updateProgress(progress);
  }

  updateProgress(percent) {
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
      this.loadingText.textContent = `Loading... ${percent}%`;
    }
  }

  onPageLoad() {
    // Wait for all assets to load
    this.checkAssetsLoading();
    
    // Set a maximum loading time of 5 seconds
    setTimeout(() => {
      this.hideLoadingScreen();
    }, 5000);
  }
  
  checkAssetsLoading() {
    // Check if all assets are loaded
    const check = () => {
      const allLoaded = this.assets.every(asset => 
        asset.complete || asset.readyState >= 3
      );
      
      if (allLoaded) {
        this.hideLoadingScreen();
      } else {
        // Check again after a short delay
        setTimeout(check, 100);
      }
    };
    
    // Start checking
    check();
  }
  
  hideLoadingScreen() {
    // Don't hide if already hidden
    if (!this.loadingScreen || this.loadingScreen.style.visibility === 'hidden') {
      return;
    }

    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.minDisplayTime - elapsed);
    
    // Use a flag to prevent multiple hide attempts
    if (this.isHiding) return;
    this.isHiding = true;
    
    const hide = () => {
      if (!this.loadingScreen) return;
      
      this.loadingScreen.style.opacity = '0';
      this.loadingScreen.style.visibility = 'hidden';
      this.loadingScreen.style.transition = 'opacity 0.5s ease, visibility 0.5s';
      
      document.body.style.overflow = 'auto';
      document.body.style.overflowX = 'hidden';
      
      // Enable navigation after initial load
      this.enableNavigation();
      
      // Clean up after hiding
      const onTransitionEnd = () => {
        if (this.loadingScreen && this.loadingScreen.parentNode) {
          this.loadingScreen.removeEventListener('transitionend', onTransitionEnd);
          this.loadingScreen.parentNode.removeChild(this.loadingScreen);
          this.loadingScreen = null;
        }
        this.isHiding = false;
      };
      
      this.loadingScreen.addEventListener('transitionend', onTransitionEnd, { once: true });
      
      // Force cleanup if transition doesn't end
      setTimeout(() => {
        if (this.loadingScreen && this.loadingScreen.parentNode) {
          this.loadingScreen.removeEventListener('transitionend', onTransitionEnd);
          this.loadingScreen.parentNode.removeChild(this.loadingScreen);
          this.loadingScreen = null;
          this.isHiding = false;
        }
      }, 1000);
    };
    
    // Ensure minimum display time
    if (remaining > 0) {
      setTimeout(hide, remaining);
    } else {
      hide();
    }
  }
  
  enableNavigation() {
    // Handle regular link clicks
    document.addEventListener('click', (e) => {
      // Find the closest anchor tag
      let target = e.target;
      while (target && target.tagName !== 'A') {
        if (target === document.body) return;
        target = target.parentNode;
      }
      
      if (!target) return;
      
      const href = target.getAttribute('href');
      
      // Skip if it's an external link, anchor link, or special link
      if (!href || 
          href.startsWith('#') || 
          href.startsWith('http') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') ||
          target.target === '_blank' ||
          e.ctrlKey || 
          e.metaKey ||
          e.shiftKey ||
          target.classList.contains('no-loader')) {
        return;
      }
      
      e.preventDefault();
      this.startPageTransition(href);
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.showLoadingScreen();
      window.location.reload();
    });
  }
  
  startPageTransition(url) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    // Create loading screen if it doesn't exist
    if (!this.loadingScreen) {
      this.createLoadingScreen();
    }
    
    // Show loading screen
    this.loadingScreen.style.opacity = '1';
    this.loadingScreen.style.visibility = 'visible';
    this.loadingScreen.style.transition = 'opacity 0.3s ease, visibility 0.3s';
    document.body.style.overflow = 'hidden';
    
    // Reset progress
    this.assetsLoaded = 0;
    this.updateProgress(0);
    
    // Start loading the next page with a small delay to ensure UI updates
    setTimeout(() => {
      window.location.href = url;
    }, 300);
  }
}

// Initialize loading screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if this is the intro page
  if (window.location.pathname.includes('intro-video.html')) {
    return; // Don't show loading screen on intro page
  }
  
  // Only initialize if loading screen doesn't exist
  if (!document.querySelector('.loading-screen')) {
    window.loadingScreen = new LoadingScreen();
  }
});
