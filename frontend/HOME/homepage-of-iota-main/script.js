document.addEventListener('DOMContentLoaded', () => {
    // --- Hero Carousel Logic ---
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    const slideInterval = 5000; // 5 seconds

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    if (slides.length > 1) {
        setInterval(nextSlide, slideInterval);
    }

    // --- Navbar Scroll Effect ---
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- GSAP Animations ---
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        /*
        gsap.from('.hero-content', {
            y: 50,
            opacity: 0,
            duration: 1.5,
            ease: 'power3.out',
            delay: 0.5
        });
        */

        // Section Animations
        const sections = document.querySelectorAll('.content-card');

        sections.forEach(section => {
            gsap.from(section, {
                y: 100,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Section Titles
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                y: 30,
                opacity: 0,
                duration: 1,
                scrollTrigger: {
                    trigger: title,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });
    }
    // --- Contact Form Handling (AJAX) ---
    const contactForm = document.getElementById('footer-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('.footer-btn');
            const originalText = btn.textContent;

            const formData = new FormData(contactForm);

            // Visual Feedback: Sending state
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    btn.textContent = 'Message Sent! ✓';
                    btn.style.background = '#27ae60';
                    contactForm.reset();
                } else {
                    btn.textContent = 'Error! Try again';
                    btn.style.background = '#e74c3c';
                }
            } catch (error) {
                btn.textContent = 'Failed to send';
                btn.style.background = '#e74c3c';
            }

            // Restore button state after delay
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        });
    }
});
