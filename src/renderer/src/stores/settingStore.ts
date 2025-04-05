import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeColor = 'teal' | 'sky' | 'rose' | 'purple';
export type FontFamily = 'system' | 'inter' | 'roboto' | 'sourceHanSans';

interface SettingState {
  themeColor: ThemeColor;
  fontSize: number;
  fontFamily: FontFamily;
  setThemeColor: (color: ThemeColor) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: FontFamily) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      themeColor: 'teal',
      fontSize: 16,
      fontFamily: 'system',
      setThemeColor: (color) => set({ themeColor: color }),
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (family) => set({ fontFamily: family }),
    }),
    {
      name: 'settings',
    }
  )
); 