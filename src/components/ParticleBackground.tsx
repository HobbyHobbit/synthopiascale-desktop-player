import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  baseSpeedX: number;
  baseSpeedY: number;
  angle: number;
  angleSpeed: number;
  pulsePhase: number; // For beat sync
}

interface ParticleBackgroundProps {
  bpm?: number;
  isBeat?: boolean;
  beatInterval?: number;
}

export function ParticleBackground({ bpm = 120, isBeat = false }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const animationFrameRef = useRef<number | null>(null);
  const beatPulseRef = useRef(0); // 0-1, decays after beat
  const bpmRef = useRef(bpm);
  const timeRef = useRef(0);

  // Update BPM ref when prop changes
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Trigger beat pulse when isBeat changes to true
  useEffect(() => {
    if (isBeat) {
      beatPulseRef.current = 1;
    }
  }, [isBeat]);

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
      const baseSpeedX = (Math.random() - 0.5) * 0.4;
      const baseSpeedY = (Math.random() - 0.5) * 0.4;
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
        angleSpeed: (Math.random() - 0.5) * 0.02,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    },
    [colors]
  );

  const initParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      const particleCount = 28;
      particlesRef.current = Array.from({ length: particleCount }, () =>
        createParticle(canvas)
      );
    },
    [createParticle]
  );

  useEffect(() => {
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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update time based on BPM
      const bpmSpeed = bpmRef.current / 120; // Normalize to 120 BPM baseline
      timeRef.current += 0.016 * bpmSpeed; // ~60fps frame time scaled by BPM

      // Decay beat pulse
      beatPulseRef.current *= 0.92;

      // Draw large ambient glow
      particlesRef.current.forEach((particle) => {
        // Pulse glow size on beat
        const beatBoost = 1 + beatPulseRef.current * 0.5;
        const glowSize = particle.size * 15 * beatBoost;
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
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 180;

          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            const repulsionStrength = force * force * 8;
            particle.x -= (dx / distance) * repulsionStrength;
            particle.y -= (dy / distance) * repulsionStrength;
          }
        }

        // BPM-synced angle speed
        const bpmMultiplier = bpmRef.current / 120;
        particle.angle += particle.angleSpeed * bpmMultiplier;
        
        // BPM-synced wave motion
        const beatPhase = timeRef.current * Math.PI * 2;
        const waveX = Math.sin(particle.angle + beatPhase * 0.5) * 0.3 * bpmMultiplier;
        const waveY = Math.cos(particle.angle * 0.7 + beatPhase * 0.3) * 0.3 * bpmMultiplier;

        // Beat pulse burst movement
        const burstX = Math.cos(particle.pulsePhase) * beatPulseRef.current * 3;
        const burstY = Math.sin(particle.pulsePhase) * beatPulseRef.current * 3;

        particle.x += (particle.baseSpeedX + waveX + burstX) * bpmMultiplier;
        particle.y += (particle.baseSpeedY + waveY + burstY) * bpmMultiplier;

        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.height + 10;
        if (particle.y > canvas.height + 10) particle.y = -10;

        ctx.save();
        ctx.beginPath();
        // Pulse particle size on beat
        const pulseSize = particle.size * (1 + beatPulseRef.current * 0.4);
        ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        // Enhanced glow on beat
        ctx.shadowBlur = particle.size * 3 * (1 + beatPulseRef.current * 2);
        ctx.shadowColor = `rgba(212, 175, 55, ${0.8 + beatPulseRef.current * 0.2})`;
        ctx.fill();
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'transparent', zIndex: 5, mixBlendMode: 'screen' }}
    />
  );
}
