import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface GlowOrbProps {
  className?: string;
  interactive?: boolean;
}

export function GlowOrb({ className, interactive = false }: GlowOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  // Primary orb: 5% intensity
  const orbPrimaryX = useTransform(springX, (v) => v * 0.05);
  const orbPrimaryY = useTransform(springY, (v) => v * 0.05);
  // Secondary orb: 3% intensity
  const orbSecondaryX = useTransform(springX, (v) => v * -0.03);
  const orbSecondaryY = useTransform(springY, (v) => v * -0.03);
  // Tertiary orb: 8% intensity
  const orbTertiaryX = useTransform(springX, (v) => v * 0.08);
  const orbTertiaryY = useTransform(springY, (v) => v * 0.08);

  useEffect(() => {
    if (!interactive || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, prefersReducedMotion, mouseX, mouseY]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}>
      {/* Primary orb */}
      <motion.div
        className="glow-orb glow-orb-primary w-72 h-72"
        style={{
          top: '20%',
          left: '30%',
          x: interactive ? orbPrimaryX : undefined,
          y: interactive ? orbPrimaryY : undefined,
        }}
        animate={{
          x: interactive ? undefined : [0, 15, -10, 0],
          y: interactive ? undefined : [0, -20, 10, 0],
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
        style={{
          bottom: '15%',
          right: '20%',
          x: interactive ? orbSecondaryX : undefined,
          y: interactive ? orbSecondaryY : undefined,
        }}
        animate={{
          x: interactive ? undefined : [0, -12, 8, 0],
          y: interactive ? undefined : [0, 10, -15, 0],
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
        style={{
          top: '60%',
          left: '15%',
          x: interactive ? orbTertiaryX : undefined,
          y: interactive ? orbTertiaryY : undefined,
        }}
        animate={{
          x: interactive ? undefined : [0, 8, -5, 0],
          y: interactive ? undefined : [0, -8, 12, 0],
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
