import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Prompt Chain Tool', description: 'Humor flavor manager' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}