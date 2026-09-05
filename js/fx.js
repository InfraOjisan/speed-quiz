/**
 * Visual Effects Engine (fx.js)
 * Glass crack (broken screen) simulation, Confetti, Neon particle glow, Screen shake
 */

class VisualEffects {
  constructor() {
    this.crackCanvas = null;
    this.crackCtx = null;
    this.particleCanvas = null;
    this.particleCtx = null;
    this.particles = [];
    this.animId = null;
  }

  init(crackCanvasId = 'crack-canvas', particleCanvasId = 'particle-canvas') {
    this.crackCanvas = document.getElementById(crackCanvasId);
    if (this.crackCanvas) {
      this.crackCtx = this.crackCanvas.getContext('2d');
      this.resizeCanvas(this.crackCanvas);
    }

    this.particleCanvas = document.getElementById(particleCanvasId);
    if (this.particleCanvas) {
      this.particleCtx = this.particleCanvas.getContext('2d');
      this.resizeCanvas(this.particleCanvas);
    }

    window.addEventListener('resize', () => {
      if (this.crackCanvas) this.resizeCanvas(this.crackCanvas);
      if (this.particleCanvas) this.resizeCanvas(this.particleCanvas);
    });

    this.startParticleLoop();
  }

  resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  // 画面バイブレーション（スマホ対応）
  vibrate(pattern = [80, 50, 80]) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore on unsupported devices
      }
    }
  }

  // 正解フラッシュ
  flashCorrect() {
    const flash = document.createElement('div');
    flash.className = 'screen-flash flash-success';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 250);
  }

  // 画面ひび割れ演出（ガラスクラッシュ＆フリーズ）
  triggerCrash(durationMs = 2000, x = null, y = null) {
    this.vibrate([150, 80, 200]);
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 400);

    if (!this.crackCanvas || !this.crackCtx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const originX = x ?? width * (0.3 + Math.random() * 0.4);
    const originY = y ?? height * (0.4 + Math.random() * 0.3);

    this.drawCrackPattern(originX, originY);
    this.crackCanvas.classList.add('active');

    // 操作不能カウントダウンタイマーなどの表示と連動
    setTimeout(() => {
      this.crackCanvas.classList.remove('active');
      this.clearCrack();
    }, durationMs);
  }

  // ガラスクラッシュ描画
  drawCrackPattern(ox, oy) {
    const ctx = this.crackCtx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
    ctx.shadowBlur = 8;

    // Center impact point
    ctx.beginPath();
    ctx.arc(ox, oy, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // Secondary concentric rings
    for (let r = 25; r < 140; r += 25 + Math.random() * 15) {
      ctx.beginPath();
      let angle = 0;
      let started = false;
      while (angle < Math.PI * 2) {
        const rad = r + (Math.random() - 0.5) * 15;
        const px = ox + Math.cos(angle) * rad;
        const py = oy + Math.sin(angle) * rad;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        angle += (Math.PI / 6) * (0.8 + Math.random() * 0.6);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Radial jagged cracks
    const numRays = 14 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numRays; i++) {
      let angle = (i * 2 * Math.PI) / numRays + (Math.random() - 0.5) * 0.2;
      let curX = ox;
      let curY = oy;
      const maxLength = Math.max(width, height) * (0.6 + Math.random() * 0.5);
      let dist = 0;

      ctx.beginPath();
      ctx.moveTo(curX, curY);

      while (dist < maxLength) {
        const step = 20 + Math.random() * 35;
        dist += step;
        angle += (Math.random() - 0.5) * 0.4;
        curX += Math.cos(angle) * step;
        curY += Math.sin(angle) * step;
        ctx.lineTo(curX, curY);

        // Branch crack
        if (Math.random() < 0.35 && dist > 40) {
          const branchAngle = angle + (Math.random() > 0.5 ? 0.7 : -0.7);
          const bStep = 25 + Math.random() * 40;
          ctx.moveTo(curX, curY);
          ctx.lineTo(curX + Math.cos(branchAngle) * bStep, curY + Math.sin(branchAngle) * bStep);
          ctx.moveTo(curX, curY);
        }
      }
      ctx.stroke();
    }

    // Vignette dark tint overlay
    ctx.fillStyle = 'rgba(255, 30, 30, 0.18)';
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  clearCrack() {
    if (!this.crackCtx || !this.crackCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.crackCtx.clearRect(0, 0, this.crackCanvas.width / dpr, this.crackCanvas.height / dpr);
  }

  // 紙吹雪（アチーブメント、高得点、クリア時）
  triggerConfetti(count = 70) {
    const colors = ['#00f5d4', '#7b2cbf', '#ff007f', '#fee440', '#00bbf9', '#ffffff'];
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'confetti',
        x: w * (0.2 + Math.random() * 0.6),
        y: h * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        size: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        alpha: 1,
        life: 140 + Math.random() * 60
      });
    }
  }

  // フィーバー用パルスパーティクル
  emitFeverSparks() {
    if (!this.particleCtx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const colors = ['#f72585', '#7209b7', '#3a0ca3', '#4cc9f0', '#ffbe0b'];

    for (let i = 0; i < 4; i++) {
      this.particles.push({
        type: 'spark',
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 6 - 3,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        life: 50 + Math.random() * 40
      });
    }
  }

  startParticleLoop() {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      this.updateParticles();
    };
    loop();
  }

  updateParticles() {
    if (!this.particleCtx || !this.particleCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.particleCanvas.width / dpr;
    const h = this.particleCanvas.height / dpr;
    const ctx = this.particleCtx;

    ctx.clearRect(0, 0, w, h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'confetti') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.alpha = Math.min(1, p.life / 40);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else if (p.type === 'spark') {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.min(1, p.life / 30);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      p.life--;
      if (p.life <= 0 || p.y > h + 50) {
        this.particles.splice(i, 1);
      }
    }
  }
}

export const fx = new VisualEffects();
