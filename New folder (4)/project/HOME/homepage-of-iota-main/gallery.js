class Gallery {
  constructor(container) {
    this.container = container || document.querySelector('.modern-gallery');
    if (!this.container) return;
    
    this.track = this.container.querySelector('.gallery-track');
    this.slides = Array.from(this.container.querySelectorAll('.gallery-slide'));
    this.prevBtn = this.container.querySelector('.prev-btn');
    this.nextBtn = this.container.querySelector('.next-btn');
    this.indicators = Array.from(this.container.querySelectorAll('.indicator'));
    this.currentSlideEl = this.container.querySelector('.current-slide');
    this.totalSlidesEl = this.container.querySelector('.total-slides');
    
    this.currentIndex = 0;
    this.isTransitioning = false;
    this.autoSlideInterval = null;
    
    this.init();
  }
  
  init() {
    if (this.slides.length === 0) return;
    
    // Set up track and slides
    this.track.style.width = `${100 * this.slides.length}%`;
    this.slides.forEach((slide, index) => {
      slide.style.width = `${100 / this.slides.length}%`;
      slide.style.float = 'left';
    });
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.updateSlide(0, false);
    this.startAutoSlide();
    
    // Update total slides counter
    if (this.totalSlidesEl) {
      this.totalSlidesEl.textContent = this.slides.length;
    }
  }
  
  setupEventListeners() {
    // Navigation buttons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
    
    // Touch events
    let touchStartX = 0;
    let touchEndX = 0;
    
    this.track.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      this.stopAutoSlide();
    }, { passive: true });
    
    this.track.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      this.handleSwipe(touchStartX, touchEndX);
      this.startAutoSlide();
    }, { passive: true });
    
    // Pause on hover
    this.container.addEventListener('mouseenter', () => this.stopAutoSlide());
    this.container.addEventListener('mouseleave', () => this.startAutoSlide());
    
    // Indicators
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.goTo(index));
    });
  }
  
  handleSwipe(startX, endX) {
    const threshold = 50;
    const difference = startX - endX;
    
    if (Math.abs(difference) > threshold) {
      if (difference > 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }
  
  updateSlide(index, animate = true) {
    if (this.isTransitioning || index < 0 || index >= this.slides.length) return;
    
    this.isTransitioning = true;
    this.currentIndex = index;
    
    // Update track position
    const translateX = -index * (100 / this.slides.length);
    this.track.style.transition = animate ? 'transform 0.5s ease' : 'none';
    this.track.style.transform = `translateX(${translateX}%)`;
    
    // Update indicators
    this.updateIndicators();
    
    // Update slide counter
    if (this.currentSlideEl) {
      this.currentSlideEl.textContent = index + 1;
    }
    
    // Reset transition flag
    const onTransitionEnd = () => {
      this.track.removeEventListener('transitionend', onTransitionEnd);
      this.isTransitioning = false;
    };
    
    this.track.addEventListener('transitionend', onTransitionEnd, { once: true });
  }
  
  updateIndicators() {
    this.indicators.forEach((indicator, index) => {
      if (index === this.currentIndex) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });
  }
  
  next() {
    if (this.isTransitioning) return;
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.updateSlide(nextIndex);
    this.resetAutoSlide();
  }
  
  prev() {
    if (this.isTransitioning) return;
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.updateSlide(prevIndex);
    this.resetAutoSlide();
  }
  
  goTo(index) {
    if (index >= 0 && index < this.slides.length) {
      this.updateSlide(index);
      this.resetAutoSlide();
    }
  }
  
  startAutoSlide() {
    if (this.autoSlideInterval) return;
    this.autoSlideInterval = setInterval(() => this.next(), 5000);
  }
  
  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }
  
  resetAutoSlide() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const gallery = new Gallery();
  window.gallery = gallery; // Make it globally available if needed
});
