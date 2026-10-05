document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.getElementById('navbar');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');

            // Animate hamburger icon
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when a link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Navbar Scroll Effect (if not already handled by page-specific script)
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    const email = 'iotajuofficial@gmail.com';
    const addContactLink = (footer) => {
        if (footer.querySelector(`a[href="mailto:${email}"]`)) return;
        const links = footer.querySelector('.footer-bottom-links') || document.createElement('div');
        links.className = 'footer-bottom-links';
        if (!links.parentElement) (footer.querySelector('.footer-bottom-content') || footer).append(links);
        const link = document.createElement('a');
        link.href = `mailto:${email}`;
        link.textContent = email;
        links.append(link);
    };

    document.querySelectorAll('footer').forEach(addContactLink);
    if (!document.querySelector('footer')) {
        const footer = document.createElement('footer');
        footer.className = 'new-footer footer-alt';
        footer.innerHTML = '<div class="footer-bottom"><div class="footer-bottom-content"><p>IOT Applications Club, Jadavpur University</p><div class="footer-bottom-links"></div></div></div>';
        document.body.append(footer);
        addContactLink(footer);
    }
});
