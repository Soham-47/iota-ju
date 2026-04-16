document.addEventListener('DOMContentLoaded', () => {
  // Get all elements to animate
  const animateElements = document.querySelectorAll('.event-row, .left-event, .right-event');

  // Options for the Intersection Observer
  const options = {
    threshold: 0.1, // Trigger when 10% of the element is visible
    rootMargin: '0px 0px -50px 0px' // Adjust when the animation triggers (50px from bottom of viewport)
  };

  // Create the observer
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Ensure all child elements are visible before starting animation
        const children = entry.target.children;
        Array.from(children).forEach(child => {
          child.style.opacity = '0';
          child.style.transform = 'translateY(20px)';
          child.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        });

        // Add the 'visible' class to parent
        entry.target.classList.add('visible');

        // Animate children with a slight stagger
        Array.from(children).forEach((child, index) => {
          setTimeout(() => {
            child.style.opacity = '1';
            child.style.transform = 'translateY(0)';
          }, 50 * index); // Small delay between children
        });

        // Stop observing after animation plays
        observer.unobserve(entry.target);
      }
    });
  }, options);

  // Observe each element
  animateElements.forEach(element => {
    // Initially hide all children
    const children = element.children;
    Array.from(children).forEach(child => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(20px)';
      child.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    });
    
    observer.observe(element);
  });
});
