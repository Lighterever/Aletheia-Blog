/**
 * 打字机效果
 */

export class Typewriter {
    constructor(speed = 50, pause = 300) {
        this.speed = speed;
        this.pause = pause;
        this.overlay = document.getElementById('typewriterOverlay');
        this.textEl = document.getElementById('typewriterText');
        this.timer = null;
    }

    play(text, callback) {
        if (!this.overlay || !this.textEl) { callback?.(); return; }
        this.stop();
        this.overlay.classList.remove('hidden');
        this.textEl.textContent = '';
        let i = 0;
        this.timer = setInterval(() => {
            this.textEl.textContent += text[i];
            i++;
            if (i >= text.length) {
                this.stop();
                setTimeout(() => { this.overlay.classList.add('hidden'); callback?.(); }, this.pause);
            }
        }, this.speed);
    }

    stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
    hide() { this.stop(); this.overlay?.classList.add('hidden'); }
}
