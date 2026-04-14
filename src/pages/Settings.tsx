import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { slideDown } from '@/lib/motion';
import { AnimatedPage } from '@/components/ui/animated-page';
import { SettingsLayout, type SettingsSection } from '@/components/settings/SettingsLayout';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import oltaflockLogo from '@/assets/oltaflock-icon.png';

const sectionComponents: Record<SettingsSection, React.ComponentType> = {
  profile: ProfileSection,
  security: SecuritySection,
  preferences: PreferencesSection,
  account: AccountSection,
};

const Settings = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const navigate = useNavigate();

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <AnimatedPage className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        variants={slideDown}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3 px-4 py-2.5 bg-card shrink-0 h-12 elevation-panel border-b border-border/50"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Studio
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <img src={oltaflockLogo} alt="Oltaflock" className="h-5 w-5 rounded-md object-cover" />
          <span className="text-sm font-semibold text-muted-foreground">Settings</span>
        </div>
      </motion.header>

      {/* Settings Content */}
      <div className="flex-1 flex overflow-hidden">
        <SettingsLayout
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        >
          <ActiveComponent />
        </SettingsLayout>
      </div>
    </AnimatedPage>
  );
};

export default Settings;
