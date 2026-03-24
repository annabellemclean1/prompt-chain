'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark'|'light'|'system'>('system')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark'|'light'|'system' || 'system'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const applyTheme = (t: string) => {
    const root = document.documentElement
    if (t === 'dark') root.setAttribute('data-theme', 'dark')
    else if (t === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
  }

  const cycle = () => {
    const next = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system'
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'

  return (
    <button onClick={cycle} style={{
      background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '6px',
      padding: '5px 10px', cursor: 'pointer', fontSize: '14px', fontFamily: 'var(--mono)',
      fontSize: '11px', color: 'var(--text-dim)'
    }} title={`Theme: ${theme}`}>
      {icon} {theme}
    </button>
  )
}