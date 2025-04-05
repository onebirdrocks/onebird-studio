import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeColor = 'teal' | 'sky' | 'rose' | 'purple';

interface SettingState {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      themeColor: 'teal',
      setThemeColor: (color) => set({ themeColor: color }),
    }),
    {
      name: 'settings',
    }
  )
); 