import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';

export function RequestsPanelSkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2 p-2"
    >
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="px-3 py-2.5 rounded-xl space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-3 rounded" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-8" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
