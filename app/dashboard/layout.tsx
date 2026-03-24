import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from './ThemeToggle'
import SignOutButton from './SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles')
    .select('is_superadmin, is_matrix_admin, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin && !profile?.is_matrix_admin) redirect('/unauthorized')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Modern, Floating Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7-xl items-center justify-between px-6 lg:px-8">

          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-indigo-500/20 shadow-lg">
              P
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white uppercase">
              Prompt Chain <span className="text-indigo-600 italic">v2</span>
            </span>
          </div>

          {/* Controls Section */}
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 pr-6">
              {profile?.email}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area with optimized padding */}
      <main className="mx-auto max-w-7-xl p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>
    </div>
  )
}