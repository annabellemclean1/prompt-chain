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
    const { error: e } = flavorModal === 'create' ? await supabase.from('humor_flavors').insert(payload) : await supabase.from('humor_flavors').update(payload).eq('id', selectedFlavor!.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); loadFlavors(); if (flavorModal === 'edit' && selectedFlavor) setSelectedFlavor({ ...selectedFlavor, ...payload })
  }

  const deleteFlavor = async () => {
    if (!selectedFlavor) return; setSaving(true)
    const { error: e } = await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); setSelectedFlavor(null); setSteps([]); loadFlavors()
  }

  const openCreateStep = () => { setStepForm({ description: '', llm_system_prompt: '', llm_user_prompt: '', llm_temperature: '0.7', llm_model_id: '6', humor_flavor_step_type_id: '1', llm_input_type_id: '1', llm_output_type_id: '1' }); setError(''); setStepModal('create') }
  const openEditStep = (s: Step) => { setSelectedStep(s); setStepForm({ description: s.description ?? '', llm_system_prompt: s.llm_system_prompt ?? '', llm_user_prompt: s.llm_user_prompt ?? '', llm_temperature: String(s.llm_temperature ?? 0.7), llm_model_id: String(s.llm_model_id ?? '6'), humor_flavor_step_type_id: String(s.humor_flavor_step_type_id ?? '1'), llm_input_type_id: String(s.llm_input_type_id ?? '1'), llm_output_type_id: String(s.llm_output_type_id ?? '1') }); setError(''); setStepModal('edit') }
  const openDeleteStep = (s: Step) => { setSelectedStep(s); setError(''); setStepModal('delete') }

  const saveStep = async () => {
    if (!selectedFlavor) return; setSaving(true); setError('')
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) : 0
    const payload: any = { humor_flavor_id: selectedFlavor.id, description: stepForm.description || null, llm_system_prompt: stepForm.llm_system_prompt || null, llm_user_prompt: stepForm.llm_user_prompt || null, llm_temperature: Number(stepForm.llm_temperature), llm_model_id: Number(stepForm.llm_model_id), humor_flavor_step_type_id: Number(stepForm.humor_flavor_step_type_id), llm_input_type_id: Number(stepForm.llm_input_type_id), llm_output_type_id: Number(stepForm.llm_output_type_id) }
    if (stepModal === 'create') payload.order_by = maxOrder + 1
    const { error: e } = stepModal === 'create' ? await supabase.from('humor_flavor_steps').insert(payload) : await supabase.from('humor_flavor_steps').update(payload).eq('id', selectedStep!.id)
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
    const idx = steps.findIndex(s => s.id === step.id); const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return
    const swap = steps[swapIdx]; await supabase.from('humor_flavor_steps').update({ order_by: swap.order_by }).eq('id', step.id); await supabase.from('humor_flavor_steps').update({ order_by: step.order_by }).eq('id', swap.id); loadSteps(selectedFlavor!.id)
  }

  const testFlavor = async () => {
    if (!selectedFlavor || !selectedImageId || !token) return; setTestLoading(true); setTestError(''); setTestResults([])
    try {
      const res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId: selectedImageId, humorFlavorId: selectedFlavor.id }) })
      if (!res.ok) throw new Error(`API error: ${await res.text()}`)
      const data = await res.json(); setTestResults(Array.isArray(data) ? data : [data])
      loadFlavorCaptions(selectedFlavor.id)
    } catch (e: any) { setTestError(e.message) }
    setTestLoading(false)
  }

  // THEME DEFINITIONS
  const theme = {
    bg: '#0f172a',
    panel: '#1e293b',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00ff88',
    subAccent: '#00e5ff',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    inputBg: '#0f172a'
  }

  const glassPanel = { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: '12px' }

  return (
    <div style={{ padding: '24px 24px', minHeight: '100vh', background: theme.bg, color: theme.textMain, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: '#fff' }}>
            Pipeline <span style={{ color: theme.accent }}>Studio</span>
          </h1>
          <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '4px', fontWeight: '500' }}>Engineered Humor Logic Engine</div>
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px', alignItems: 'start' }}>

        {/* SIDEBAR: FLAVORS */}
        <div style={glassPanel}>
          <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.textMuted }}>Configurations</span>
            <button onClick={openCreateFlavor} style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ padding: '10px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted, fontSize: '12px' }}>Loading...</div>
            ) : flavors.map(f => (
              <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{
                padding: '14px 16px', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px',
                background: selectedFlavor?.id === f.id ? 'rgba(0, 255, 136, 0.08)' : 'transparent',
                borderLeft: selectedFlavor?.id === f.id ? `3px solid ${theme.accent}` : '3px solid transparent',
                transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: selectedFlavor?.id === f.id ? theme.accent : theme.textMain }}>{f.slug}</div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description || 'No description'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN: WORKSPACE */}
        {selectedFlavor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* FLAVOR CARD */}
            <div style={{ ...glassPanel, padding: '32px', background: `linear-gradient(135deg, ${theme.panel} 0%, #1e293b 100%)`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '10px', color: theme.accent, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Active Config</div>
                  <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{selectedFlavor.slug}</h2>
                  <p style={{ fontSize: '15px', color: theme.textMuted, marginTop: '8px', maxWidth: '600px', lineHeight: '1.6' }}>{selectedFlavor.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => openEditFlavor(selectedFlavor)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit Meta</button>
                  <button onClick={openDeleteFlavor} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>

            {/* WORKFLOW SEQUENCE */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Logic Chain</span>
                <button onClick={openCreateStep} style={{ background: 'none', border: 'none', color: theme.accent, fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>+ ADD NEW STEP</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {steps.map((s, idx) => (
                  <div key={s.id} style={{ ...glassPanel, overflow: 'hidden', borderLeft: `4px solid ${theme.accent}` }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: theme.accent, background: 'rgba(0,255,136,0.1)', padding: '4px 8px', borderRadius: '4px' }}>STEP {idx + 1}</span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{s.description || 'Process Node'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: '#0f172a', border: '1px solid #334155', color: theme.textMuted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => moveStep(s, 'up')} disabled={idx === 0}>↑</button>
                        <button style={{ background: '#0f172a', border: '1px solid #334155', color: theme.textMuted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1}>↓</button>
                        <button style={{ background: theme.subAccent, border: 'none', color: '#000', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '900' }} onClick={() => openEditStep(s)}>CONFIGURE</button>
                        <button style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '900' }} onClick={() => openDeleteStep(s)}>×</button>
                      </div>
                    </div>
                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: theme.textMuted, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>System Logic</div>
                        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', minHeight: '60px', lineHeight: '1.6' }}>
                          {s.llm_system_prompt || <span style={{ fontStyle: 'italic', color: '#475569' }}>Inheriting Global Context...</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: theme.textMuted, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>User Instruction</div>
                        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', minHeight: '60px', lineHeight: '1.6' }}>
                          {s.llm_user_prompt || <span style={{ fontStyle: 'italic', color: '#475569' }}>Awaiting User Variables...</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TESTER / SANDBOX */}
            <div style={{ ...glassPanel, padding: '32px', background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Live Execution Sandbox</h3>
                <button onClick={testFlavor} disabled={testLoading} style={{ background: theme.accent, color: '#000', border: 'none', padding: '12px 32px', borderRadius: '8px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: `0 0 20px ${theme.accent}33` }}>
                  {testLoading ? 'RUNNING PIPELINE...' : 'EXECUTE SEQUENCE'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '12px' }}>
                {images.slice(0, 15).map(img => (
                  <img key={img.id} src={img.url} onClick={() => setSelectedImageId(img.id)} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: selectedImageId === img.id ? `3px solid ${theme.accent}` : '2px solid transparent', opacity: selectedImageId === img.id ? 1 : 0.5, transition: '0.2s' }} />
                ))}
              </div>

              <div style={{ background: '#020617', borderRadius: '12px', padding: '24px', border: '1px solid #1e293b', fontFamily: 'monospace' }}>
                <div style={{ color: theme.subAccent, fontSize: '11px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>TERMINAL OUTPUT:</div>
                {testResults.length > 0 ? testResults.map((r, i) => (
                  <div key={i} style={{ color: '#fff', fontSize: '14px', marginBottom: '10px', paddingLeft: '12px', borderLeft: `2px solid ${theme.accent}`, lineHeight: '1.6' }}>
                    {typeof r === 'string' ? r : (r.content ?? JSON.stringify(r))}
                  </div>
                )) : <div style={{ color: '#334155', fontSize: '12px', textAlign: 'center', padding: '20px' }}>// AWAITING SIGNAL...</div>}
                {testError && <div style={{ color: '#ef4444', marginTop: '10px' }}>ERROR: {testError}</div>}
              </div>
            </div>

            {/* PRODUCTION HISTORY */}
            <div style={glassPanel}>
               <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, fontSize: '11px', fontWeight: '900', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Deployment History (Captions)</div>
               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 {captionsLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted, fontSize: '12px' }}>REFRESHING RECORDS...</div>
                 ) : flavorCaptions.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#334155', fontSize: '12px' }}>NO RECORDS FOUND FOR THIS FLAVOR</div>
                 ) : flavorCaptions.map(c => (
                   <div key={c.id} style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
                     {c.content}
                   </div>
                 ))}
               </div>
            </div>

          </div>
        ) : (
          <div style={{ ...glassPanel, padding: '120px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.3em', color: theme.textMuted }}>SELECT SYSTEM CONFIGURATION</div>
          </div>
        )}
      </div>

      {/* MODAL: FLAVOR */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '380px', padding: '28px', background: theme.panel }}>
             <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px', color: theme.accent }}>Flavor Setup</h3>
             <input placeholder="Flavor Slug (e.g. dark-humor)" style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px', color: '#fff', marginBottom: '16px', outline: 'none' }} value={flavorForm.slug} onChange={e => setFlavorForm(v => ({...v, slug: e.target.value}))} />
             <textarea placeholder="Instructional focus for this flavor..." style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px', color: '#fff', height: '120px', outline: 'none', lineHeight: '1.6' }} value={flavorForm.description} onChange={e => setFlavorForm(v => ({...v, description: e.target.value}))} />
             <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button onClick={() => setFlavorModal(null)} style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Cancel</button>
                <button onClick={saveFlavor} style={{ flex: 1, background: theme.accent, color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Save Config</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: STEP */}
      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '480px', padding: '28px', background: theme.panel, maxHeight: '90vh', overflowY: 'auto' }}>
             <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px', color: theme.subAccent }}>Configure Step Logic</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <input placeholder="Step Description (e.g. Image Analysis)" style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px', color: '#fff', outline: 'none' }} value={stepForm.description} onChange={e => setStepForm(v => ({...v, description: e.target.value}))} />

               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>TEMPERATURE</label>
                    <input style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', color: '#fff' }} value={stepForm.llm_temperature} onChange={e => setStepForm(v => ({...v, llm_temperature: e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>MODEL ID</label>
                    <input style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', color: '#fff' }} value={stepForm.llm_model_id} onChange={e => setStepForm(v => ({...v, llm_model_id: e.target.value}))} />
                  </div>
               </div>

               <div>
                 <label style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>SYSTEM PROMPT (CONTEXT)</label>
                 <textarea style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px', color: '#fff', height: '120px', fontFamily: 'monospace', outline: 'none' }} value={stepForm.llm_system_prompt} onChange={e => setStepForm(v => ({...v, llm_system_prompt: e.target.value}))} />
               </div>

               <div>
                 <label style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>USER PROMPT (INSTRUCTIONS)</label>
                 <textarea style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px', color: '#fff', height: '120px', fontFamily: 'monospace', outline: 'none' }} value={stepForm.llm_user_prompt} onChange={e => setStepForm(v => ({...v, llm_user_prompt: e.target.value}))} />
               </div>
             </div>

             <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button onClick={() => setStepModal(null)} style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Discard</button>
                <button onClick={saveStep} style={{ flex: 1, background: theme.subAccent, color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Deploy Logic</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRM */}
      {(flavorModal === 'delete' || stepModal === 'delete') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ ...glassPanel, width: '380px', padding: '40px', textAlign: 'center', border: '1px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444', fontWeight: '900', fontSize: '20px', marginBottom: '12px' }}>Confirm Wipe</h3>
            <p style={{ color: theme.textMuted, fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>Are you sure you want to remove this node? This action cannot be reversed.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setFlavorModal(null); setStepModal(null); }} style={{ flex: 1, background: '#1e293b', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Cancel</button>
              <button onClick={flavorModal === 'delete' ? deleteFlavor : deleteStep} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}