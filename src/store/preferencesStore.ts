import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type DefaultMode = 'image' | 'video' | 'image-to-image';

interface PreferencesState {
  theme: Theme;
  defaultMode: DefaultMode;
  notificationSound: boolean;
  setTheme: (theme: Theme) => void;
  setDefaultMode: (mode: DefaultMode) => void;
  setNotificationSound: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: (localStorage.getItem('theme') as Theme) || 'system',
      defaultMode: 'image',
      notificationSound: true,
      setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
        set({ theme });
      },
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
    }),
    {
      name: 'oltaflock-preferences',
      partialize: (state) => ({
        theme: state.theme,
        defaultMode: state.defaultMode,
        notificationSound: state.notificationSound,
      }),
    }
  )
);
