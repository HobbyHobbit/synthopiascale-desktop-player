import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  visible: boolean;
  className?: string;
  intensity?: number; // 0-1, audio reactivity
}

export function GlassCard({ children, visible, className = '', intensity = 0 }: GlassCardProps) {
  if (!visible) return null;

  // Crystal-clear effect: ~90% transparent base, subtle audio reactivity
  const bgOpacity = 0.05 + intensity * 0.08; // 5% base, up to 13% with audio
  const borderOpacity = 0.15 + intensity * 0.25;
  const glowIntensity = 0.05 + intensity * 0.15;

  return (
    <div
      className={`
        absolute inset-4 z-30
        rounded-3xl overflow-hidden
        ${className}
      `}
      style={{
        background: `rgba(0, 0, 0, ${bgOpacity})`,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        border: `1px solid rgba(212, 175, 55, ${borderOpacity})`,
        boxShadow: `
          0 4px 16px 0 rgba(0, 0, 0, 0.1),
          0 0 ${20 + intensity * 40}px rgba(212, 175, 55, ${glowIntensity}),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
        `,
        willChange: 'transform',
        transform: 'translateZ(0)',
        contain: 'layout paint',
      }}
    >
      {/* Subtle crystal edge highlights */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none">
        {/* Top edge */}
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
          }}
        />
        {/* Bottom edge */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          }}
        />
        {/* Left edge */}
        <div 
          className="absolute top-0 bottom-0 left-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.25), transparent)',
          }}
        />
        {/* Right edge */}
        <div 
          className="absolute top-0 bottom-0 right-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          }}
        />
      </div>

      {/* Very subtle light reflection */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle 600px at 30% 30%, 
            rgba(255, 255, 255, 0.03) 0%, 
            transparent 50%)`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Subtle gold accent */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle 400px at 70% 70%, 
            rgba(212, 175, 55, 0.05) 0%, 
            transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Content */}
      <div className="relative w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
