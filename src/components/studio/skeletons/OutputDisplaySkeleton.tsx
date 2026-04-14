import { motion } from 'framer-motion';
import { fadeIn } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';

export function OutputDisplaySkeleton() {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col gap-4"
    >
      <Skeleton className="flex-1 rounded-2xl min-h-[200px]" />
      <div className="space-y-2 shrink-0">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </motion.div>
  );
}
