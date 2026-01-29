import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  baseSpeedX: number;
  baseSpeedY: number;
  opacity: number;
  color: string;
  angle: number;
  angleSpeed: number;
  pulsePhase: number;
}

interface ParticleBackgroundProps {
  enabled?: boolean;
}

export function ParticleBackground({ enabled = true }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const colors = [
    'rgba(220, 225, 235, 0.6)',
    'rgba(200, 210, 225, 0.55)',
    'rgba(240, 245, 250, 0.5)',
    'rgba(255, 255, 255, 0.45)',
    'rgba(212, 175, 55, 0.35)',
    'rgba(212, 175, 55, 0.25)',
  ];

  const createParticle = useCallback(
    (canvas: HTMLCanvasElement): Particle => {
      const baseSpeedX = (Math.random() - 0.5) * 0.3;
      const baseSpeedY = (Math.random() - 0.5) * 0.3;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 7 + 3,
        speedX: baseSpeedX,
        speedY: baseSpeedY,
        baseSpeedX,
        baseSpeedY,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    },
    [colors]
  );

  const initParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      // Reduced particle count for better performance
      const particleCount = 16;
      particlesRef.current = Array.from({ length: particleCount }, () =>
        createParticle(canvas)
      );
    },
    [createParticle]
  );

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = (currentTime: number) => {
      // Throttle to ~30fps for better performance
      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < 33) { // ~30fps
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gentle time progression (no BPM coupling)
      timeRef.current += 0.016;

      // Draw large ambient glow
      particlesRef.current.forEach((particle) => {
        const glowSize = particle.size * 15;
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          glowSize
        );
        gradient.addColorStop(0, `rgba(212, 175, 55, ${particle.opacity * 0.12})`);
        gradient.addColorStop(0.3, `rgba(212, 175, 55, ${particle.opacity * 0.06})`);
        gradient.addColorStop(0.6, `rgba(255, 220, 120, ${particle.opacity * 0.03})`);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Mouse interaction
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 180;

          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            const repulsionStrength = force * force * 6;
            particle.x -= (dx / distance) * repulsionStrength;
            particle.y -= (dy / distance) * repulsionStrength;
          }
        }

        // Gentle angle rotation
        particle.angle += particle.angleSpeed;

        // Gentle wave motion (independent of playback)
        const wavePhase = timeRef.current * 0.5;
        const waveX = Math.sin(particle.angle + wavePhase) * 0.2;
        const waveY = Math.cos(particle.angle * 0.7 + wavePhase * 0.6) * 0.2;

        particle.x += particle.baseSpeedX + waveX;
        particle.y += particle.baseSpeedY + waveY;

        // Wrap around edges
        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.height + 10;
        if (particle.y > canvas.height + 10) particle.y = -10;

        // Draw particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = particle.size * 3;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
        ctx.fill();
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, initParticles]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'transparent', zIndex: 5, mixBlendMode: 'screen' }}
    />
  );
}
