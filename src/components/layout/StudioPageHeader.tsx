import { motion } from 'framer-motion';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { slideDown } from '@/lib/motion';
import { KIE_CATALOG as MODEL_CATALOG } from '@catalog/index.ts';
import { UserMenu } from '@/components/studio/UserMenu';
import { usePreferencesStore } from '@/store/preferencesStore';

const IMAGE_COUNT = MODEL_CATALOG.filter((m) => m.output === 'image').length;
const VIDEO_COUNT = MODEL_CATALOG.length - IMAGE_COUNT;

/**
 * Studio page title row: the history panel toggle and the account menu
 * (with sign out). The live credit balance lives in the AppShell sidebar.
 */
export function StudioPageHeader() {
  const { showStudioSidebar, setShowStudioSidebar } = usePreferencesStore();
  const Toggle = showStudioSidebar ? PanelRightClose : PanelRightOpen;

  return (
    <motion.header
      variants={slideDown}
      initial="hidden"
      animate="visible"
      className="flex items-end justify-between gap-4 px-6 2xl:px-8 pt-6 pb-5 shrink-0"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="font-serif text-[34px] leading-none tracking-[-0.015em]">Create</h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          {IMAGE_COUNT} image and {VIDEO_COUNT} video models, each with a Prompt Brain tuned for it
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setShowStudioSidebar(!showStudioSidebar)}
          className="h-9 px-3 hidden xl:inline-flex items-center gap-2 rounded-[10px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-smooth"
          aria-pressed={showStudioSidebar}
        >
          <Toggle className="h-4 w-4" />
          History
        </button>
        <UserMenu />
      </div>
    </motion.header>
  );
}
