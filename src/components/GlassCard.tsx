import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  visible: boolean;
  className?: string;
  intensity?: number; // 0-1, audio reactivity
}

export function GlassCard({ children, visible, className = '', intensity = 0 }: GlassCardProps) {
  if (!visible) return null;

  // Dynamic opacity based on audio intensity (like read-only source)
  const bgOpacity = 0.15 + intensity * 0.1;
  const borderOpacity = 0.2 + intensity * 0.3;
  const glowIntensity = 0.1 + intensity * 0.2;

  return (
    <div
      className={`
        absolute inset-4 z-30
        rounded-3xl overflow-hidden
        transition-all duration-100 ease-out
        ${className}
      `}
      style={{
        background: `rgba(0, 0, 0, ${bgOpacity})`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid rgba(212, 175, 55, ${borderOpacity})`,
        boxShadow: `
          0 8px 32px 0 rgba(0, 0, 0, 0.25),
          0 0 ${40 + intensity * 60}px rgba(212, 175, 55, ${glowIntensity}),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.2)
        `,
      }}
    >
      {/* Crystal edge highlights */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none">
        {/* Top edge */}
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
          }}
        />
        {/* Bottom edge */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
          }}
        />
        {/* Left edge */}
        <div 
          className="absolute top-0 bottom-0 left-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
          }}
        />
        {/* Right edge */}
        <div 
          className="absolute top-0 bottom-0 right-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
          }}
        />
      </div>

      {/* Light reflection overlay */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle 600px at 30% 30%, 
            rgba(255, 255, 255, 0.08) 0%, 
            rgba(255, 255, 255, 0.03) 30%, 
            transparent 60%)`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Gold accent reflection */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle 400px at 70% 70%, 
            rgba(212, 175, 55, 0.15) 0%, 
            rgba(212, 175, 55, 0.05) 40%, 
            transparent 60%)`,
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
