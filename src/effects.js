// Shared, short-lived Canvas particles. Velocities use pixels/second, independent of frame rate.
export class ParticleSystem {
  constructor() { this.particles = []; this.lastTime = 0; }
  burst(kind, x, y) {
    const palettes = { buy: ["#fff3b6", "#e8c46c", "#c7e7a0"], sell: ["#f3d488", "#fff4c6"],
      build: ["#eee0bd", "#be7955"], twist: ["#f2d075", "#dc865c", "#fff2c2"] };
    const colors = palettes[kind] || palettes.buy;
    for (let i = 0; i < 22; i++) {
      const angle = i / 22 * Math.PI * 2;
      const speed = 38 + Math.random() * 75;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30,
        life: .8 + Math.random() * .35, total: 1.15, size: 2 + Math.random() * 3,
        gravity: 90, color: colors[i % colors.length] });
    }
  }
  celebrate(width) {
    const colors = ["#edca77", "#e66b51", "#f7e8b6", "#7cb5ad"];
    for (let i = 0; i < 65; i++) this.particles.push({ x: Math.random() * width, y: -Math.random() * 90,
      vx: (Math.random() - .5) * 80, vy: 35 + Math.random() * 60, life: 2.4, total: 2.4,
      size: 3 + Math.random() * 4, gravity: 35, color: colors[i % colors.length] });
  }
  draw(ctx, now) {
    const dt = Math.min(.05, this.lastTime ? (now - this.lastTime) / 1000 : .016);
    this.lastTime = now;
    this.particles = this.particles.filter(particle => particle.life > 0);
    ctx.save();
    for (const particle of this.particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt; particle.life -= dt;
      ctx.globalAlpha = Math.min(1, Math.max(0, particle.life / particle.total * 1.8));
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.restore();
  }
  clear() { this.particles = []; }
}
