/**
 * Navbar — Global navigation bar.
 * Glass-morphism design, scroll-aware hide/show (slide-up on scroll down,
 * reveal on scroll up), active page state, link click routing.
 */

export class Navbar {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById('globalNav');
        this.links = document.getElementById('navLinks');
        this.mobileMenu = document.getElementById('mobileMenu');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');

        this.mobileMenuBtn?.addEventListener('click', () => this.mobileMenu?.classList.toggle('hidden'));
        document.addEventListener('click', e => {
            if (!this.mobileMenu?.contains(e.target) && !this.mobileMenuBtn?.contains(e.target)) {
                this.mobileMenu?.classList.add('hidden');
            }
        });
        this.mobileMenu?.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => this.mobileMenu?.classList.add('hidden'));
        });
    }

    updateActive(page) {
        this.links?.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    show() { this.el?.classList.remove('hidden'); }
    hide() { this.el?.classList.add('hidden'); }
}
