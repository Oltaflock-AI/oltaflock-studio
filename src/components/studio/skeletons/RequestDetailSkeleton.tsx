import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';

export function RequestDetailSkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-5"
    >
      {/* Status row */}
      <motion.div variants={staggerItem} className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </motion.div>

      {/* Request ID */}
      <motion.div variants={staggerItem} className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-full rounded-md" />
      </motion.div>

      {/* Parameters */}
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} variants={staggerItem} className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </motion.div>
      ))}

      {/* Prompt */}
      <motion.div variants={staggerItem} className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </motion.div>
    </motion.div>
  );
}
