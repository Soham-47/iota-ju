// Global Loader System for IOTA Website
// This script ensures consistent loading behavior across all pages

class GlobalLoader {
  constructor() {
    this.loadingScreen = null;
    this.progressBar = null;
    this.loadingText = null;
    this.minDisplayTime = 1000; // Minimum display time in ms
    this.startTime = Date.now();
    this.isLoading = true;
    this.assetsLoaded = false;
    this.pageShown = false;
    
    this.init();
  }
  
  init() {
    // Create loading screen if it doesn't exist
    if (!document.querySelector('.global-loading-screen')) {
      this.createLoadingScreen();
    }
    
    // Start loading assets
    this.loadAssets();
    
    // Set up event listeners
    window.addEventListener('load', () => this.onPageLoad());
    
    // Fallback in case load event doesn't fire
    setTimeout(() => this.onPageLoad(), 5000);
  }
  
  createLoadingScreen() {
    // Create loading screen element
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.className = 'global-loading-screen';
    
    // Add styles
    const styles = `
      .global-loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #1a1a1a;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        transition: opacity 0.5s ease, visibility 0.5s;
      }
      
      .global-loader {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      .global-loading-text {
        color: #fff;
        font-size: 1.2rem;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
      }
      
      .global-progress-bar {
        width: 200px;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .global-progress-fill {
        height: 100%;
        width: 0%;
        background-color: #3498db;
        transition: width 0.3s ease;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    // Add styles to head
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    // Create loader elements
    const loader = document.createElement('div');
    loader.className = 'global-loader';
    
    this.loadingText = document.createElement('div');
    this.loadingText.className = 'global-loading-text';
    this.loadingText.textContent = 'Loading... 0%';
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'global-progress-bar';
    
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'global-progress-fill';
    
    // Assemble loading screen
    progressContainer.appendChild(this.progressBar);
    this.loadingScreen.appendChild(loader);
    this.loadingScreen.appendChild(this.loadingText);
    this.loadingScreen.appendChild(progressContainer);
    
    // Add to body
    document.body.prepend(this.loadingScreen);
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
  }
  
  updateProgress(percent) {
    if (!this.loadingScreen) return;
    
    // Ensure percent is between 0 and 100
    percent = Math.max(0, Math.min(100, Math.round(percent)));
    
    // Update progress bar and text
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    
    if (this.loadingText) {
      this.loadingText.textContent = `Loading... ${percent}%`;
    }
    
    // If we've reached 100%, check if we can hide
    if (percent >= 100) {
      this.assetsLoaded = true;
      this.tryHideLoadingScreen();
    }
  }
  
  loadAssets() {
    let loaded = 0;
    let total = 0;
    let checkComplete = () => {
      if (loaded >= total) {
        this.updateProgress(100);
      }
    };
    
    // Count all assets
    const images = Array.from(document.images);
    const scripts = Array.from(document.scripts);
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const iframes = Array.from(document.getElementsByTagName('iframe'));
    const videos = Array.from(document.getElementsByTagName('video'));
    
    // Count only elements that are in the document
    total = images.length + 
            scripts.length + 
            links.length + 
            iframes.length + 
            videos.length;
    
    // If no assets, complete immediately
    if (total === 0) {
      this.updateProgress(100);
      return;
    }
    
    // Function to handle asset load/error
    const handleAsset = (element, isLoaded = false) => {
      if (isLoaded) {
        loaded++;
        this.updateProgress((loaded / total) * 100);
        checkComplete();
        return true;
      }
      
      return new Promise(resolve => {
        const onLoad = () => {
          element.removeEventListener('load', onLoad);
          element.removeEventListener('error', onError);
          loaded++;
          this.updateProgress((loaded / total) * 100);
          checkComplete();
          resolve(true);
        };
        
        const onError = () => {
          element.removeEventListener('load', onLoad);
          element.removeEventListener('error', onError);
          loaded++;
          this.updateProgress((loaded / total) * 100);
          checkComplete();
          resolve(true);
        };
        
        element.addEventListener('load', onLoad);
        element.addEventListener('error', onError);
        
        // Fallback in case events don't fire
        setTimeout(() => {
          if (element.readyState === 'complete' || element.readyState === 'loaded') {
            onLoad();
          } else {
            onError();
          }
        }, 1000);
      });
    };
    
    // Track images
    images.forEach(img => {
      if (img.complete) {
        handleAsset(img, true);
      } else {
        handleAsset(img);
      }
    });
    
    // Track scripts
    scripts.forEach(script => {
      if (script.readyState === 'loaded' || script.readyState === 'complete') {
        handleAsset(script, true);
      } else {
        handleAsset(script);
      }
    });
    
    // Track stylesheets
    links.forEach(link => {
      if (link.sheet) {
        handleAsset(link, true);
      } else {
        handleAsset(link);
      }
    });
    
    // Track iframes
    iframes.forEach(iframe => {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        handleAsset(iframe, true);
      } else {
        handleAsset(iframe);
      }
    });
    
    // Track videos
    videos.forEach(video => {
      if (video.readyState >= 3) { // HAVE_FUTURE_DATA or more
        handleAsset(video, true);
      } else {
        handleAsset(video);
      }
    });
    
    // Fallback in case we miss some events
    setTimeout(() => {
      if (loaded < total) {
        loaded = total;
        this.updateProgress(100);
      }
    }, 3000);
  }
  
  onPageLoad() {
    // Mark page as loaded
    this.pageShown = true;
    this.tryHideLoadingScreen();
  }
  
  tryHideLoadingScreen() {
    // Only hide if both assets are loaded and minimum display time has passed
    if (this.assetsLoaded && this.pageShown) {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.minDisplayTime - elapsed);
      
      if (remaining <= 0) {
        this.hideLoadingScreen();
      } else {
        setTimeout(() => this.hideLoadingScreen(), remaining);
      }
    }
  }
  
  hideLoadingScreen() {
    if (!this.loadingScreen || !this.isLoading) return;
    
    this.isLoading = false;
    
    // Fade out loading screen
    this.loadingScreen.style.opacity = '0';
    
    // Remove loading screen after fade out
    setTimeout(() => {
      if (this.loadingScreen && this.loadingScreen.parentNode) {
        this.loadingScreen.parentNode.removeChild(this.loadingScreen);
      }
      
      // Re-enable scrolling
      document.body.style.overflow = '';
      
      // Show any content that was hidden
      document.documentElement.style.visibility = 'visible';
    }, 500);
  }
}

// Initialize the global loader when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.globalLoader = new GlobalLoader();
  });
} else {
  window.globalLoader = new GlobalLoader();
}

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalLoader;
}
