// Initialize GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Animate TEAM IOTA heading with smooth centered entrance
document.addEventListener('DOMContentLoaded', () => {
  const heading = document.querySelector('.hero h1');
  if (heading) {
    // Set initial state
    gsap.set(heading, {
      opacity: 0,
      y: 40,
      scale: 0.95
    });
    
    // Animate the heading with GSAP
    gsap.to(heading, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.3,
      onComplete: () => {
        // Make sure heading stays visible after animation
        heading.style.opacity = '1';
        heading.style.transform = 'none';
      }
    });
  }
});

// Nav scroll effect - only apply to nav, not the heading
gsap.to("nav", {
  scrollTrigger: {
    trigger: "nav",
    start: "top top",
    end: "+=100",
    toggleClass: {
      targets: "nav",
      className: "scrolled"
    },
    markers: false
  }
});

// Loop through each group-photo-section and animate the image + text
gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll(".group-photo-section").forEach((section) => {
  const img = section.querySelector(".group-photo-img");
  const text = section.querySelector(".group-photo-text");

  // Animate image
  gsap.from(img, {
    opacity: 0,
    y: 80,
    scale: 0.95,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: section,
      start: "top 85%",
      end: "top 40%",
      toggleActions: "play none none reverse",
    },
  });

  // Animate text slightly after image
  gsap.from(text, {
    opacity: 0,
    y: 40,
    duration: 1,
    delay: 0.2,
    ease: "power2.out",
    scrollTrigger: {
      trigger: section,
      start: "top 85%",
      end: "top 40%",
      toggleActions: "play none none reverse",
    },
  });
});



gsap.registerPlugin(ScrollTrigger);

// Animate each .teammembers section
document.querySelectorAll(".teammembers").forEach((section) => {
  const elements = section.querySelectorAll(".scale");

  gsap.from(elements, {
    opacity: 0,
    y: 50,
    scale: 0.95,
    duration: 0.8,
    stagger: 0.1,
    ease: "power2.out",
    scrollTrigger: {
      trigger: section,
      start: "top 80%",
      end: "top 30%",
      toggleActions: "play none none reverse",
    },
  });
});




gsap.registerPlugin(ScrollTrigger);

const footerTl = gsap.timeline({
  scrollTrigger: {
    trigger: "footer",
    start: "top 85%",
    end: "top 30%",
    toggleActions: "play none none reverse",
  },
});

footerTl
  .from("footer h2", {
    y: -50,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
  })
  .from(
    ".footRoutes h1",
    {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
    },
    "-=0.5"
  ) // overlaps slightly with previous
  .from(
    ".footchat div",
    {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power2.out",
    },
    "-=0.5"
  );
