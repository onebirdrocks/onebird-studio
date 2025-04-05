import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 检查系统主题偏好
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(darkModeMediaQuery.matches)

    // 监听系统主题变化
    const listener = (e: MediaQueryListEvent) => {
      setIsDark(e.matches)
      document.documentElement.classList.toggle('dark', e.matches)
    }
    darkModeMediaQuery.addEventListener('change', listener)

    return () => {
      darkModeMediaQuery.removeEventListener('change', listener)
    }
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return {
    isDark,
    toggleTheme
  }
} 