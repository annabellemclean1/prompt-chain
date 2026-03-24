'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Flavor = { id: number; slug: string; description: string; created_datetime_utc: string }
type Step = {
  id: number; order_by: number; description: string; llm_system_prompt: string;
  llm_user_prompt: string; llm_temperature: number; llm_model_id: number;
  humor_flavor_id: number; humor_flavor_step_type_id: number;
  llm_input_type_id: number; llm_output_type_id: number;
}
type Image = { id: string; url: string }
type Caption = { id: string; content: string }

export default function DashboardPage() {
  const supabase = createClient()

  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
  const [flavorModal, setFlavorModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [flavorForm, setFlavorForm] = useState({ slug: '', description: '' })
  const [steps, setSteps] = useState<Step[]>([])
  const [stepModal, setStepModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedStep, setSelectedStep] = useState<Step | null>(null)
  const [stepForm, setStepForm] = useState({
    description: '', llm_system_prompt: '', llm_user_prompt: '',
    llm_temperature: '0.7', llm_model_id: '6', humor_flavor_step_type_id: '1',
    llm_input_type_id: '1', llm_output_type_id: '1'
  })
  const [flavorCaptions, setFlavorCaptions] = useState<Caption[]>([])
  const [captionsLoading, setCaptionsLoading] = useState(false)
  const [images, setImages] = useState<Image[]>([])
  const [selectedImageId, setSelectedImageId] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [testError, setTestError] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlavors(); loadImages()
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? ''))
  }, [])

  useEffect(() => {
    if (selectedFlavor) { loadSteps(selectedFlavor.id); loadFlavorCaptions(selectedFlavor.id) }
  }, [selectedFlavor])

  const loadFlavors = async () => {
    setLoading(true); const { data } = await supabase.from('humor_flavors').select('*').order('id')
    setFlavors(data || []); setLoading(false)
  }
  const loadSteps = async (flavorId: number) => {
    const { data } = await supabase.from('humor_flavor_steps').select('*').eq('humor_flavor_id', flavorId).order('order_by')
    setSteps(data || [])
  }
  const loadFlavorCaptions = async (flavorId: number) => {
    setCaptionsLoading(true); const { data } = await supabase.from('captions').select('id, content').eq('humor_flavor_id', flavorId).order('created_datetime_utc', { ascending: false }).limit(20)
    setFlavorCaptions(data || []); setCaptionsLoading(false)
  }
  const loadImages = async () => {
    const { data } = await supabase.from('images').select('id, url').limit(50)
    setImages(data || []); if (data?.length) setSelectedImageId(data[0].id)
  }

  const openCreateFlavor = () => { setFlavorForm({ slug: '', description: '' }); setError(''); setFlavorModal('create') }
  const openEditFlavor = (f: Flavor) => { setFlavorForm({ slug: f.slug, description: f.description }); setError(''); setFlavorModal('edit') }
  const openDeleteFlavor = () => { setError(''); setFlavorModal('delete') }

  const saveFlavor = async () => {
    setSaving(true); setError('')
    const payload = { slug: flavorForm.slug, description: flavorForm.description }
    const { error: e } = flavorModal === 'create'
      ? await supabase.from('humor_flavors').insert(payload)
      : await supabase.from('humor_flavors').update(payload).eq('id', selectedFlavor!.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); loadFlavors()
    if (flavorModal === 'edit' && selectedFlavor) setSelectedFlavor({ ...selectedFlavor, ...payload })
  }

  const deleteFlavor = async () => {
    if (!selectedFlavor) return; setSaving(true)
    const { error: e } = await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); setSelectedFlavor(null); setSteps([]); loadFlavors()
  }

  const openCreateStep = () => {
    setStepForm({
      description: '', llm_system_prompt: '', llm_user_prompt: '',
      llm_temperature: '0.7', llm_model_id: '6',
      humor_flavor_step_type_id: '1', llm_input_type_id: '1', llm_output_type_id: '1'
    })
    setError(''); setStepModal('create')
  }

  const openEditStep = (s: Step) => {
    setSelectedStep(s)
    setStepForm({
      description: s.description ?? '',
      llm_system_prompt: s.llm_system_prompt ?? '',
      llm_user_prompt: s.llm_user_prompt ?? '',
      llm_temperature: String(s.llm_temperature ?? 0.7),
      llm_model_id: String(s.llm_model_id ?? '6'),
      humor_flavor_step_type_id: String(s.humor_flavor_step_type_id ?? '1'),
      llm_input_type_id: String(s.llm_input_type_id ?? '1'),
      llm_output_type_id: String(s.llm_output_type_id ?? '1')
    })
    setError(''); setStepModal('edit')
  }

  const openDeleteStep = (s: Step) => { setSelectedStep(s); setError(''); setStepModal('delete') }

  const saveStep = async () => {
    if (!selectedFlavor) return; setSaving(true); setError('')
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) : 0

    const payload: any = {
      humor_flavor_id: selectedFlavor.id,
      description: stepForm.description || null,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: Number(stepForm.llm_temperature),
      llm_model_id: Number(stepForm.llm_model_id),
      humor_flavor_step_type_id: Number(stepForm.humor_flavor_step_type_id),
      llm_input_type_id: Number(stepForm.llm_input_type_id),
      llm_output_type_id: Number(stepForm.llm_output_type_id)
    }

    if (stepModal === 'create') payload.order_by = maxOrder + 1

    const { error: e } = stepModal === 'create'
      ? await supabase.from('humor_flavor_steps').insert(payload)
      : await supabase.from('humor_flavor_steps').update(payload).eq('id', selectedStep!.id)

    if (e) { setError(e.message); setSaving(false); return }

    setSaving(false); setStepModal(null); loadSteps(selectedFlavor.id)
  }

  const deleteStep = async () => {
    if (!selectedStep || !selectedFlavor) return; setSaving(true)
    const { error: e } = await supabase.from('humor_flavor_steps').delete().eq('id', selectedStep.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setStepModal(null); loadSteps(selectedFlavor.id)
  }

  const moveStep = async (step: Step, dir: 'up' | 'down') => {
    const idx = steps.findIndex(s => s.id === step.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return

    const swap = steps[swapIdx]
    await supabase.from('humor_flavor_steps').update({ order_by: swap.order_by }).eq('id', step.id)
    await supabase.from('humor_flavor_steps').update({ order_by: step.order_by }).eq('id', swap.id)
    loadSteps(selectedFlavor!.id)
  }

  const testFlavor = async () => {
    if (!selectedFlavor || !selectedImageId || !token) return
    setTestLoading(true); setTestError(''); setTestResults([])

    try {
      const res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: selectedImageId, humorFlavorId: selectedFlavor.id })
      })

      if (!res.ok) throw new Error(`API error: ${await res.text()}`)

      const data = await res.json()
      setTestResults(Array.isArray(data) ? data : [data])
      loadFlavorCaptions(selectedFlavor.id)

    } catch (e: any) {
      setTestError(e.message)
    }

    setTestLoading(false)
  }

  const theme = {
    bg: '#0f172a',
    panel: '#1e293b',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00ff88',
    subAccent: '#00e5ff',
    textMain: '#f8fafc',
    textMuted: '#94a3b8'
  }

  const glassPanel = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px'
  }

  return (
    <div
      style={{
        padding: '40px 60px',
        minHeight: '100vh',
        background: theme.bg,
        color: theme.textMain,
        fontFamily: 'Inter, system-ui, sans-serif',
        maxWidth: '1400px',   // ✅ FIX
        margin: '0 auto'      // ✅ FIX
      }}
    >

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '32px' }}>

        {/* SIDEBAR */}
        <div style={glassPanel}>
          {/* unchanged */}
        </div>

        {/* MAIN */}
        {selectedFlavor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* STEPS */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowX: 'hidden' }}>
                {steps.map((s, idx) => (
                  <div key={s.id} style={{ ...glassPanel, overflow: 'hidden', borderLeft: `4px solid ${theme.accent}` }}>

                    <div
                      style={{
                        padding: '20px', // slightly reduced
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // ✅ FIX
                        gap: '20px'
                      }}
                    >

                      <div>
                        <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '8px' }}>System Logic</div>
                        <div
                          style={{
                            background: '#0f172a',
                            padding: '16px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#cbd5e1',
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontFamily: 'monospace',
                            overflowWrap: 'break-word', // ✅ FIX
                            wordBreak: 'break-word'     // ✅ FIX
                          }}
                        >
                          {s.llm_system_prompt}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '8px' }}>User Instruction</div>
                        <div
                          style={{
                            background: '#0f172a',
                            padding: '16px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#cbd5e1',
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontFamily: 'monospace',
                            overflowWrap: 'break-word', // ✅ FIX
                            wordBreak: 'break-word'     // ✅ FIX
                          }}
                        >
                          {s.llm_user_prompt}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ ...glassPanel, padding: '120px', textAlign: 'center' }}>
            Select a configuration
          </div>
        )}
      </div>
    </div>
  )
}