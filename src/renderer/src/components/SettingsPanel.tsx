import { ThemeColorPicker } from './ThemeColorPicker';

export function SettingsPanel() {
  return (
    <div className="p-2.5 flex flex-col items-center">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">主题设置</div>
      <ThemeColorPicker />
    </div>
  );
} 