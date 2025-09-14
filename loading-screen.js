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
    // Get all images, scripts, and stylesheets
    const images = Array.from(document.images);
    const scripts = Array.from(document.scripts);
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    // Combine all assets
    this.assets = [...images, ...scripts, ...links];
    
    // If no assets to load, update progress
    if (this.assets.length === 0) {
      this.updateProgress(100);
      return;
    }
    
    // Add load/error event listeners to all assets
    this.assets.forEach(asset => {
      if (asset.complete) {
        this.onAssetLoaded();
      } else {
        asset.addEventListener('load', () => this.onAssetLoaded());
        asset.addEventListener('error', () => this.onAssetLoaded());
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
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.minDisplayTime - elapsed);
    
    setTimeout(() => {
      this.loadingScreen.style.opacity = '0';
      this.loadingScreen.style.visibility = 'hidden';
      document.body.style.overflow = 'auto';
      
      // Enable navigation after initial load
      this.enableNavigation();
    }, remaining);
  }
  
  enableNavigation() {
    document.querySelectorAll('a').forEach(link => {
      if (link.href && !link.classList.contains('no-loader')) {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('#') && !href.includes('javascript:') && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.startPageTransition(href);
          }
        });
      }
    });
  }
  
  startPageTransition(url) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    // Show loading screen
    this.loadingScreen.style.opacity = '1';
    this.loadingScreen.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    
    // Reset progress
    this.assetsLoaded = 0;
    this.updateProgress(0);
    
    // Start loading the next page
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
