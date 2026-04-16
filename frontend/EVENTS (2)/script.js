// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Navbar scroll effect
const navbar = document.querySelector("nav");
if (navbar) {
  navbar.style.transition = "background 0.3s, opacity 0.3s";
  window.addEventListener("scroll", () => {
    const opacity = Math.max(1 - window.scrollY / 200, 0);
    navbar.style.opacity = opacity;
  });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => 
  {
  // Setup scroll animations for all event sections
  const eventSections = document.querySelectorAll('.event-container, .event-row, .left-event, .right-event');
  
  eventSections.forEach((section, index) => {
    // Add a small delay between each section's animation
    const delay = index * 0.1;
    
    // Set initial state
    gsap.set(section, {
      opacity: 0,
      y: 50
    });
    
    // Create scroll trigger for each section
    gsap.to(section, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: delay,
      scrollTrigger: {
        trigger: section,
        start: 'top 85%',
        toggleActions: 'play none none none',
        onEnter: () => section.classList.add('animate'),
        onLeaveBack: () => section.classList.remove('animate')
      }
    });
    
    // Animate child elements with a slight stagger
    const children = section.children;
    gsap.set(children, { opacity: 0, y: 20 });
    
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.05,
      ease: 'power2.out',
      delay: delay + 0.2,
      scrollTrigger: {
        trigger: section,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });
  
  // Footer animation
  const footerH3 = document.querySelector("footer h3");
  if (footerH3) {
    const text = footerH3.textContent;
    footerH3.innerHTML = text.split("").map(char =>
      `<span class="footer-h3-letter">${char === " " ? "&nbsp;" : char}</span>`
    ).join("");

    gsap.from(".footer-h3-letter", {
      x: -30,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.04,
      scrollTrigger: {
        trigger: footerH3,
        start: "top 90%",
        toggleActions: "play reset play reset",
      }
    });
  }
  
  // Infinite horizontal scroll for track elements
  const tracks = document.querySelectorAll('.track');
  tracks.forEach(track => {
    gsap.to(track, {
      xPercent: -100,
      ease: "none",
      duration: 20,
      repeat: -1,
      ease: "linear"
    });
  });
  
  // Simple fade-in animation for all event rows
  function initEventAnimations() {
    // Animate all event rows with a simple fade-in
    gsap.utils.toArray('.event-row').forEach((row) => {
      // Clear any inline styles first
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.6s ease-out';
      
      // Add to observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
          }
        });
      }, { threshold: 0.1 });
      
      observer.observe(row);
    });
  }
  
  // Initialize animations when GSAP is ready
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEventAnimations);
    } else {
      initEventAnimations();
    }
  }
  
  // Recent events animation
  gsap.from(".content-2", {
    x: -100,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".recent-events h2",
      start: "top 90%",
      toggleActions: "play reset play reset",
    }
  });

  gsap.from(".recent-events", {
    x: 150,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".events1",
      start: "top 90%",
      toggleActions: "play none none none",
    }
  });

  gsap.from(".recent-events h2", {
    x: -100,
    opacity: 0,
    duration: 2,
    delay: 0.5,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".recent-events h2",
      start: "top 80%",
      toggleActions: "play reset play reset",
      markers: true
    }
  });

  // Event highlight animation
  gsap.to(".track", {
    xPercent: -100,
    ease: "linear",
    duration: 20,
    repeat: -1,
  });
  gsap.from(".event-image", {
    x: -200,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".event-highlight",
      start: "top center", // trigger when .event-highlight top hits center of viewport
      toggleActions: "play none none none",
      scrub: false, // optional: disable if you want one-time animation
    },
  });
  
  gsap.from(".event-text", {
    x: 200,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".event-highlight",
      start: "top center",
      toggleActions: "play none none none",
      scrub: false,
    },
  });
  
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ once: false });
}); // Close DOMContentLoaded

// Event text animation
gsap.from(".event-text", {
  x: 100,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".event-highlight",
    start: "top center",
    markers: false
  }
});
