// GSAP Animations and Core Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Register GSAP plugins
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    // Navigation animation
    if (typeof gsap !== 'undefined') {
        // Navbar scroll effect
        gsap.to("nav", {
            opacity: 0,
            scale: 0.95,
            duration: 1.5,
            scrollTrigger: {
                trigger: "nav",
                scroller: "body",
                start: "top -10%",
                end: "top -200%",
                scrub: true,
                toggleActions: "play none none reverse",
            },
        });

        // Hero section animation
        const heroTimeline = gsap.timeline();
        heroTimeline
            .from(".herocontent", {
                x: 1000,
                opacity: 0,
                scale: 0.8,
                duration: 1.4,
                ease: "power3.out",
            })
            .from(
                "nav",
                {
                    y: -100,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power2.out",
                },
                "-=0.5"
            );

        // Page 2 animations
        const page2Animations = [
            { selector: ".page2content>h1", x: -400, y: 0 },
            { selector: ".homeevents", x: 0, y: 200 },
            { selector: ".eventtxt", x: 300, y: 100 }
        ];

        page2Animations.forEach(anim => {
            gsap.from(anim.selector, {
                x: anim.x,
                y: anim.y,
                opacity: 0,
                duration: 1.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: ".page2content",
                    scroller: "body",
                    start: "top 70%",
                    end: "top 40%",
                    scrub: 2,
                    toggleActions: "play reverse play reverse",
                },
            });
        });

        // Page 3 animations
        gsap.from(".page3>h1", {
            y: 150,
            opacity: 0,
            scale: 0.95,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".page3",
                scroller: "body",
                start: "top 65%",
                end: "top 40%",
                scrub: 2,
                toggleActions: "play reverse play reverse",
            },
        });

        // Know More section animations
        const knowMoreAnimations = [
            { selector: ".knowmore>h1", y: 150 },
            { selector: ".knowmore>h2", x: -300, y: 0 },
            { selector: ".knowmorecontent .knowmorecontentleft", x: -500 },
            { selector: ".knowmorecontent .knowmorecontentright", x: 500 }
        ];

        knowMoreAnimations.forEach(anim => {
            gsap.from(anim.selector, {
                x: anim.x || 0,
                y: anim.y || 0,
                opacity: 0,
                duration: 2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: ".knowmorecontent",
                    scroller: "body",
                    start: "top 80%",
                    end: "top 40%",
                    scrub: 2,
                    toggleActions: "play reverse play reverse",
                },
            });
        });
    }

    // Hero Carousel Functionality
    const heroSlides = document.querySelectorAll('.hero-slide');
    let heroCurrent = 0;
    let carouselInterval = null;

    function showHeroSlide(idx) {
        if (heroSlides.length === 0) return;
        
        if (idx < 0) idx = heroSlides.length - 1;
        if (idx >= heroSlides.length) idx = 0;
        
        heroSlides.forEach((slide, i) => {
            if (slide) {
                slide.style.transition = 'opacity 0.5s ease-in-out';
                slide.style.opacity = i === idx ? '1' : '0';
                slide.style.zIndex = i === idx ? '1' : '0';
            }
        });
        
        heroCurrent = idx;
    }

    function startHeroCarousel() {
        if (heroSlides.length <= 1) return;
        
        // Clear any existing interval
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
        
        carouselInterval = setInterval(() => {
            showHeroSlide(heroCurrent + 1);
        }, 5000); // Change slide every 5 seconds
    }

    // Initialize hero carousel if slides exist
    if (heroSlides.length > 0) {
        showHeroSlide(0);
        startHeroCarousel();
        
        // Clean up interval when page is unloaded
        window.addEventListener('beforeunload', () => {
            if (carouselInterval) clearInterval(carouselInterval);
        });
    }

    // Single function to handle GSAP refresh
    function refreshGSAP() {
        if (typeof ScrollTrigger !== 'undefined') {
            // Small delay to ensure all elements are rendered
            setTimeout(() => {
                ScrollTrigger.refresh();
            }, 100);
        }
    }

    // Set up event listeners for GSAP refresh
    window.addEventListener('load', refreshGSAP);
    window.addEventListener('resize', refreshGSAP);
    
    // Initial refresh
    refreshGSAP();
});
