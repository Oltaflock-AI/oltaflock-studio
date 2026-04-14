import { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { User, Shield, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'account', label: 'Account', icon: AlertTriangle },
] as const;

export type SettingsSection = (typeof sections)[number]['id'];

interface SettingsLayoutProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  children: React.ReactNode;
}

export function SettingsLayout({ activeSection, onSectionChange, children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Side nav */}
      <motion.nav
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-56 shrink-0 border-r border-border/50 bg-card p-4 space-y-1 overflow-y-auto"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <motion.div key={section.id} variants={staggerItem}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 font-medium',
                  activeSection === section.id && 'bg-accent text-accent-foreground'
                )}
                onClick={() => onSectionChange(section.id)}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Button>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-8">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
