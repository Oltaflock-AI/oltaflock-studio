import type { Variants, Transition } from 'framer-motion';

// --- Transitions ---

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

export const quickTransition: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

// --- Variants ---

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: smoothTransition },
  exit: { opacity: 0, transition: quickTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: -8, transition: quickTransition },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: 12, transition: quickTransition },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: -20, transition: quickTransition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.95, transition: quickTransition },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

// --- Page Transitions ---

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

// --- Component-specific ---

export const numberChange: Variants = {
  initial: { opacity: 0, y: -8, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springTransition },
};

export const panelReveal: Variants = {
  hidden: { opacity: 0, x: 10, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: smoothTransition },
  exit: { opacity: 0, x: -10, filter: 'blur(4px)', transition: quickTransition },
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: 8, height: 0, transition: { duration: 0.15 } },
};

export const iconSwap: Variants = {
  initial: { opacity: 0, rotate: -90, scale: 0.5 },
  animate: { opacity: 1, rotate: 0, scale: 1, transition: springTransition },
  exit: { opacity: 0, rotate: 90, scale: 0.5, transition: quickTransition },
};

// --- Interactive ---

export const buttonTap = { scale: 0.97 };
export const buttonHover = { scale: 1.02 };
export const cardHover = { y: -2, scale: 1.005, transition: { duration: 0.2 } };
