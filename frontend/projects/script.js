// Gallery Horizontal Scroll
document.addEventListener('DOMContentLoaded', function() {
  const galleryScroll = document.getElementById('galleryScroll');
  if (!galleryScroll) return;

  // Clone images for infinite scroll effect
  const images = galleryScroll.querySelectorAll('img');
  const imagesArray = Array.from(images);
  
  // Double the images for seamless looping
  imagesArray.forEach(img => {
    const clone = img.cloneNode(true);
    galleryScroll.appendChild(clone);
  });

  // Set initial position
  let scrollPosition = 0;
  const speed = 1.5; // Pixels to move per frame (adjust as needed)
  let isPaused = false;
  let animationId;
  let lastTimestamp = 0;
  const frameRate = 60; // Target FPS
  const frameDelay = 1000 / frameRate;
  let lastFrameTime = 0;

  function animateGallery(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    
    if (deltaTime >= frameDelay) {
      if (!isPaused) {
        scrollPosition += speed;
        
        // Reset scroll position when reaching the end of the first set of images
        if (scrollPosition >= galleryScroll.scrollWidth / 2) {
          scrollPosition = 0;
        }
        
        galleryScroll.scrollLeft = scrollPosition;
      }
      lastFrameTime = timestamp - (deltaTime % frameDelay);
    }
    
    animationId = requestAnimationFrame(animateGallery);
  }
  
  // Handle hover to pause
  galleryScroll.addEventListener('mouseenter', () => {
    isPaused = true;
    galleryScroll.style.cursor = 'grab';
  });
  
  galleryScroll.addEventListener('mouseleave', () => {
    isPaused = false;
    galleryScroll.style.cursor = 'default';
  });
  
  // Handle touch events for mobile
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  
  galleryScroll.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX - galleryScroll.offsetLeft;
    scrollLeft = galleryScroll.scrollLeft;
    galleryScroll.style.cursor = 'grabbing';
    galleryScroll.style.userSelect = 'none';
  });
  
  galleryScroll.addEventListener('mouseup', () => {
    isDragging = false;
    galleryScroll.style.cursor = 'grab';
    galleryScroll.style.removeProperty('user-select');
  });
  
  galleryScroll.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - galleryScroll.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    galleryScroll.scrollLeft = scrollLeft - walk;
  });
  
  // Touch events for mobile
  galleryScroll.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - galleryScroll.offsetLeft;
    scrollLeft = galleryScroll.scrollLeft;
  }, { passive: false });
  
  galleryScroll.addEventListener('touchend', () => {
    isDragging = false;
  }, { passive: false });
  
  galleryScroll.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.touches[0].pageX - galleryScroll.offsetLeft;
    const walk = (x - startX) * 2;
    galleryScroll.scrollLeft = scrollLeft - walk;
  }, { passive: false });
  
  // Start the animation
  animationId = requestAnimationFrame(animateGallery);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationId);
  });
});
