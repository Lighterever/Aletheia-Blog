/**
 * 矩阵雨效果
 */

export class MatrixRain {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
        this.animationId = null;
        this.chars = '01∅∆∇∈∉⊂⊃∀∃∂∫√∞≈≠≤≥+-×÷±';
        this.fontSize = 14;
        this.drops = [];
        this.accentColor = '#64ffda';
        this.bgColor = 'rgba(10, 10, 15, 0.05)';
        if (canvas) this.setupCanvas();
    }

    updateColors() {
        const style = getComputedStyle(document.documentElement);
        this.accentColor = style.getPropertyValue('--accent-primary').trim();
        const bgRgb = style.getPropertyValue('--bg-primary-rgb').trim() || '10, 10, 15';
        this.bgColor = `rgba(${bgRgb}, 0.05)`;
    }

    setupCanvas() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.drops = Array(Math.floor(this.canvas.width / this.fontSize)).fill(1);
    }

    start() {
        if (!this.canvas || this.animationId) return;
        this.setupCanvas();
        this.updateColors();
        const draw = () => {
            this.ctx.fillStyle = this.bgColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = this.accentColor;
            this.ctx.font = this.fontSize + 'px JetBrains Mono, monospace';
            for (let i = 0; i < this.drops.length; i++) {
                this.ctx.fillText(this.chars[Math.floor(Math.random() * this.chars.length)], i * this.fontSize, this.drops[i] * this.fontSize);
                if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) this.drops[i] = 0;
                this.drops[i]++;
            }
            this.animationId = requestAnimationFrame(draw);
        };
        draw();
    }

    stop() {
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
