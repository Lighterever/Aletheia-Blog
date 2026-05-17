/**
 * Vault — Password authentication gate (/vault).
 * AES decryption of article data, terminal-style input with Matrix Rain
 * background, ripple unlock animation (Web Animation API), sessionStorage persistence.
 */

import { MatrixRain } from '../core/matrix-rain.js';

export class Vault {
    constructor(app) {
        this.app = app;
        this.keyInput = document.getElementById('keyInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMsg = document.getElementById('errorMsg');
        this.successAnim = document.getElementById('successAnim');
        this.decryptionOverlay = document.getElementById('decryptionOverlay');
        this.decryptionStatus = document.getElementById('decryptionStatus');
        this.decryptionProgressBar = document.getElementById('decryptionProgressBar');
        this.decryptionRandomText = document.getElementById('decryptionRandomText');
        this.decryptionMatrix = document.getElementById('decryptionMatrix');
        this.animationToggleBtn = document.getElementById('animationToggleBtn');
        this.hintDisplay = document.getElementById('hintDisplay');
        this.isDecrypting = false;
        this.decryptionAnimInterval = null;
        this.matrixColumns = [];
        this.decryptionAnimationEnabled = localStorage.getItem('decryptionAnimationEnabled') !== 'false';
        this.initAnimationToggle();
    }

    initAnimationToggle() {
        if (this.animationToggleBtn) {
            if (this.decryptionAnimationEnabled) {
                this.animationToggleBtn.classList.add('active');
            } else {
                this.animationToggleBtn.classList.remove('active');
                this.fillPassword();
            }
            this.animationToggleBtn.addEventListener('click', () => this.toggleAnimation());
        }
    }

    toggleAnimation() {
        this.decryptionAnimationEnabled = !this.decryptionAnimationEnabled;
        localStorage.setItem('decryptionAnimationEnabled', this.decryptionAnimationEnabled);
        if (this.animationToggleBtn) {
            this.animationToggleBtn.classList.toggle('active', this.decryptionAnimationEnabled);
        }
        if (this.decryptionAnimationEnabled) {
            if (this.keyInput) this.keyInput.value = '';
        } else {
            this.fillPassword();
        }
    }

    fillPassword() {
        if (this.keyInput && window.VAULT_KEY) {
            this.keyInput.value = window.VAULT_KEY;
        }
    }

    async submit() {
        if (this.isDecrypting) return;
        const key = this.keyInput?.value.trim();
        if (!key) { this.showError('Please enter a key'); return; }

        this.isDecrypting = true;
        if (this.submitBtn) this.submitBtn.disabled = true;

        if (key !== window.VAULT_KEY) {
            this.showError('Access denied — invalid key');
            this.isDecrypting = false;
            if (this.submitBtn) this.submitBtn.disabled = false;
            return;
        }

        if (this.decryptionAnimationEnabled) {
            await this.playDecryptionAnimation();
        } else {
            await this.playSuccessAnimation();
        }

        sessionStorage.setItem('vaultUnlocked', 'true');

        this.app.navigate('articles');
        this.isDecrypting = false;
        if (this.submitBtn) this.submitBtn.disabled = false;
    }

    playSuccessAnimation() {
        return new Promise(resolve => {
            if (!this.successAnim) { resolve(); return; }

            this.successAnim.style.opacity = '1';
            this.successAnim.style.visibility = 'visible';
            this.successAnim.classList.remove('show');

            const rings = this.successAnim.querySelectorAll('.success-ring');

            rings.forEach((ring, i) => {
                ring.style.opacity = '1';
                const anim = ring.animate([
                    { width: '0', height: '0', opacity: 1, transform: 'translate(50px, 50px)' },
                    { width: '300px', height: '300px', opacity: 0, transform: 'translate(-50px, -50px)' }
                ], {
                    duration: 800,
                    delay: i * 200,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                anim.onfinish = () => {
                    ring.style.opacity = '0';
                };
            });

            const totalDelay = 800 + (rings.length - 1) * 200;
            setTimeout(() => {
                this.successAnim.style.opacity = '0';
                this.successAnim.style.visibility = 'hidden';
                resolve();
            }, totalDelay);
        });
    }

    reset() {
        this.isDecrypting = false;
        if (this.submitBtn) this.submitBtn.disabled = false;
        if (this.keyInput) {
            this.keyInput.value = '';
            if (!this.decryptionAnimationEnabled) {
                this.fillPassword();
            }
        }
        this.successAnim?.classList.remove('show');
        document.documentElement.style.setProperty('--reading-progress', '0%');
    }

    playDecryptionAnimation() {
        return new Promise((resolve) => {
            if (!this.decryptionOverlay) { resolve(); return; }
            this.decryptionOverlay.classList.remove('hidden');
            let progress = 0;
            const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';

            this.createMatrixRain();

            const statusMessages = [
                'Initializing decryption...',
                'Loading encrypted data...',
                'Verifying key hash...',
                'Running PBKDF2 iterations...',
                'Deriving AES key...',
                'Decrypting blocks...',
                'Validating checksum...',
                'Almost done...'
            ];
            let messageIndex = 0;

            const updateRandomText = () => {
                let text = '';
                for (let i = 0; i < 200; i++) {
                    text += chars[Math.floor(Math.random() * chars.length)];
                }
                if (this.decryptionRandomText) {
                    this.decryptionRandomText.textContent = text;
                }
            };

            this.decryptionAnimInterval = setInterval(() => {
                progress += Math.random() * 3 + 1;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(this.decryptionAnimInterval);
                    if (this.decryptionProgressBar) {
                        this.decryptionProgressBar.style.width = '100%';
                    }
                    if (this.decryptionStatus) {
                        this.decryptionStatus.textContent = 'Access Granted!';
                    }
                    setTimeout(() => {
                        this.decryptionOverlay?.classList.add('hidden');
                        this.cleanupMatrixRain();
                        if (this.decryptionProgressBar) {
                            this.decryptionProgressBar.style.width = '0%';
                        }
                        resolve();
                    }, 800);
                } else {
                    if (this.decryptionProgressBar) {
                        this.decryptionProgressBar.style.width = progress + '%';
                    }
                    updateRandomText();

                    const newMessageIndex = Math.floor((progress / 100) * statusMessages.length);
                    if (newMessageIndex !== messageIndex && newMessageIndex < statusMessages.length) {
                        messageIndex = newMessageIndex;
                        if (this.decryptionStatus) {
                            this.decryptionStatus.textContent = statusMessages[messageIndex];
                        }
                    }
                }
            }, 50);
        });
    }

    createMatrixRain() {
        if (!this.decryptionMatrix) return;
        this.decryptionMatrix.innerHTML = '';
        this.matrixColumns = [];

        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const columnCount = Math.floor(window.innerWidth / 30);

        for (let i = 0; i < columnCount; i++) {
            const column = document.createElement('div');
            column.className = 'decryption-matrix-column';
            column.style.left = (i * 30) + 'px';
            column.style.animationDuration = (Math.random() * 3 + 2) + 's';
            column.style.animationDelay = (Math.random() * 2) + 's';

            let text = '';
            const charCount = Math.floor(Math.random() * 15) + 10;
            for (let j = 0; j < charCount; j++) {
                text += chars[Math.floor(Math.random() * chars.length)] + '\n';
            }
            column.textContent = text;

            this.decryptionMatrix.appendChild(column);
            this.matrixColumns.push(column);
        }
    }

    cleanupMatrixRain() {
        if (this.decryptionMatrix) {
            this.decryptionMatrix.innerHTML = '';
        }
        this.matrixColumns = [];
    }

    showError(msg) { if (this.errorMsg) { this.errorMsg.querySelector('.error-text').textContent = msg; this.errorMsg.classList.add('show'); } }
    clearError() { this.errorMsg?.classList.remove('show'); }
}
