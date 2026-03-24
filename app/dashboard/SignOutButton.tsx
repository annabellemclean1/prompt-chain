'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()
  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <button onClick={signOut} style={{
      background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
      padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--mono)',
      fontSize: '11px', color: 'var(--text-dim)'
    }}>Sign Out</button>
  )
}