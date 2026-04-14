import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface MouseParallaxProps {
  children: ReactNode;
  className?: string;
}

interface ParallaxLayerProps {
  children: ReactNode;
  depth: number;
  className?: string;
}

const mouseX = { value: useMotionValue ? null : null } as { value: ReturnType<typeof useMotionValue> | null };
const mouseY = { value: useMotionValue ? null : null } as { value: ReturnType<typeof useMotionValue> | null };

export function MouseParallax({ children, className }: MouseParallaxProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.value?.set((e.clientX - centerX) / centerX);
      mouseY.value?.set((e.clientY - centerY) / centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion]);

  return <div className={className}>{children}</div>;
}

export function ParallaxLayer({ children, depth, className }: ParallaxLayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const springX = useSpring(mx, { stiffness: 100, damping: 30 });
  const springY = useSpring(my, { stiffness: 100, damping: 30 });

  const x = useTransform(springX, (v) => v * depth * 30);
  const y = useTransform(springY, (v) => v * depth * 30);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mx.set((e.clientX - centerX) / centerX);
      my.set((e.clientY - centerY) / centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, mx, my]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}
