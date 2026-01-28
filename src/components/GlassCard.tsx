import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  visible: boolean;
  className?: string;
}

export function GlassCard({ children, visible, className = '' }: GlassCardProps) {
  if (!visible) return null;

  return (
    <div
      className={`
        absolute inset-4 z-30
        rounded-3xl overflow-hidden
        backdrop-blur-xl
        bg-gradient-to-br from-white/10 via-white/5 to-transparent
        border border-white/20
        shadow-2xl shadow-black/20
        transition-all duration-500 ease-out
        ${className}
      `}
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(255,255,255,0.12) 0%, 
            rgba(255,255,255,0.05) 40%, 
            rgba(0,0,0,0.1) 100%
          )
        `,
        boxShadow: `
          inset 0 1px 1px rgba(255,255,255,0.15),
          inset 0 -1px 1px rgba(0,0,0,0.1),
          0 25px 50px -12px rgba(0,0,0,0.5)
        `,
      }}
    >
      {/* Top reflection highlight */}
      <div 
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      
      {/* Content */}
      <div className="relative w-full h-full flex flex-col">
        {children}
      </div>
      
      {/* Bottom shadow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)'
        }}
      />
    </div>
  );
}
