import { motion } from 'framer-motion';

interface GlowOrbProps {
  className?: string;
}

export function GlowOrb({ className }: GlowOrbProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}>
      {/* Primary orb */}
      <motion.div
        className="glow-orb glow-orb-primary w-72 h-72"
        style={{ top: '20%', left: '30%' }}
        animate={{
          x: [0, 15, -10, 0],
          y: [0, -20, 10, 0],
          scale: [1, 1.05, 0.97, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Secondary orb */}
      <motion.div
        className="glow-orb glow-orb-accent w-56 h-56"
        style={{ bottom: '15%', right: '20%' }}
        animate={{
          x: [0, -12, 8, 0],
          y: [0, 10, -15, 0],
          scale: [1, 0.98, 1.04, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      {/* Tertiary small orb */}
      <motion.div
        className="glow-orb glow-orb-primary w-32 h-32 opacity-30"
        style={{ top: '60%', left: '15%' }}
        animate={{
          x: [0, 8, -5, 0],
          y: [0, -8, 12, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
    </div>
  );
}
