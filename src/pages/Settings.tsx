import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { AccountSection, DangerZoneSection } from '@/components/settings/AccountSection';
import { PlanSection } from '@/components/settings/PlanSection';

const Settings = () => {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8 flex flex-col gap-5">
        <header className="flex flex-col gap-0.5">
          <h1 className="font-serif text-[28px] font-medium leading-tight">Settings</h1>
          <p className="text-[13px] text-muted-foreground">Profile, security and credits</p>
        </header>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6"
        >
          {/* Left column */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            <motion.div variants={staggerItem}>
              <ProfileSection />
            </motion.div>
            <motion.div variants={staggerItem}>
              <SecuritySection />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            <motion.div variants={staggerItem}>
              <PlanSection />
            </motion.div>
            <motion.div variants={staggerItem}>
              <PreferencesSection />
            </motion.div>
            <motion.div variants={staggerItem}>
              <AccountSection />
            </motion.div>
            <motion.div variants={staggerItem}>
              <DangerZoneSection />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default Settings;
