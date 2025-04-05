import { ThemeColor, useSettingStore } from '../stores/settingStore';

const themeOptions: { value: ThemeColor; label: string; color: string }[] = [
  { value: 'teal', label: '青绿色', color: 'bg-teal-500' },
  { value: 'sky', label: '天蓝色', color: 'bg-sky-500' },
  { value: 'rose', label: '玫瑰色', color: 'bg-rose-500' },
  { value: 'purple', label: '紫色', color: 'bg-purple-500' },
];

export function ThemeColorPicker() {
  const { themeColor, setThemeColor } = useSettingStore();

  return (
    <div className="flex gap-1.5">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          className={`w-5 h-5 rounded-full ${option.color} ring-1 ring-offset-1 dark:ring-offset-gray-900 transition-all
            ${themeColor === option.value ? 'ring-slate-800 dark:ring-white scale-110' : 'ring-transparent scale-100 hover:scale-105'}
          `}
          onClick={() => setThemeColor(option.value)}
          title={option.label}
        />
      ))}
    </div>
  );
} 