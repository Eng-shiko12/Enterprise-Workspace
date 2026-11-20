import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './contexts'

const read = () => {
  try {
    return localStorage.getItem('vortex_theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0e14' : '#ffffff')
    try {
      localStorage.setItem('vortex_theme', theme)
    } catch {
      /* storage unavailable (private mode) */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
