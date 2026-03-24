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

  // --- LOGIC (KEEPING EVERYTHING IDENTICAL) ---
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
    } catch (e: any) { setTestError(e.message) }
    setTestLoading(false)
  }

  // --- STYLING VARS (NEW VIBE) ---
  const glassPanel = { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }

  return (
    <div style={{ padding: '40px 60px', minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--sans)' }}>

      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Intelligence Orchestrator</div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em' }}>Prompt Chain <span style={{ color: '#6366f1' }}>Tool</span></h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px', alignItems: 'start' }}>

        {/* LEFT: FLAVOR LIST */}
        <div style={glassPanel}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>Library</span>
            <button
              onClick={openCreateFlavor}
              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 'bold', cursor: 'pointer' }}
            >+</button>
          </div>
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '11px' }}>Syncing...</div>
            ) : flavors.map(f => (
              <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{
                padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: selectedFlavor?.id === f.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                borderLeft: selectedFlavor?.id === f.id ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: selectedFlavor?.id === f.id ? '#6366f1' : '#ccc' }}>{f.slug}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description || 'Behavioral model unset'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: MAIN CANVAS */}
        {selectedFlavor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Flavor Meta */}
            <div style={{ ...glassPanel, padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Active Model #{selectedFlavor.id}</div>
                  <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px' }}>{selectedFlavor.slug}</h2>
                  <p style={{ fontSize: '14px', color: '#888', maxWidth: '600px', lineHeight: '1.6' }}>{selectedFlavor.description || 'No description provided.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }} onClick={() => openEditFlavor(selectedFlavor)}>Edit Settings</button>
                  <button style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }} onClick={openDeleteFlavor}>Delete</button>
                </div>
              </div>
            </div>

            {/* Step Chain */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444' }}>Logic Sequence</span>
                <button
                   onClick={openCreateStep}
                   style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: '11px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.05em' }}
                >+ ADD NODE</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {steps.map((s, idx) => (
                  <div key={s.id} style={{ ...glassPanel, padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '4px 8px', borderRadius: '4px' }}>0{idx + 1}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{s.description || 'Step Node'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: '#222', border: 'none', color: '#888', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }} onClick={() => moveStep(s, 'up')} disabled={idx === 0}>↑</button>
                        <button style={{ background: '#222', border: 'none', color: '#888', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }} onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1}>↓</button>
                        <button style={{ background: '#222', border: 'none', color: '#6366f1', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }} onClick={() => openEditStep(s)}>Edit</button>
                        <button style={{ background: '#222', border: 'none', color: '#ef4444', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }} onClick={() => openDeleteStep(s)}>Del</button>
                      </div>
                    </div>

                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>System Configuration</div>
                        <div style={{ background: '#070707', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#aaa', minHeight: '60px', border: '1px solid #1a1a1a', fontFamily: 'var(--mono)', lineHeight: '1.6' }}>
                          {s.llm_system_prompt || <span style={{ italic: 'true', color: '#333' }}>No system context...</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>User Instruction</div>
                        <div style={{ background: '#070707', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#aaa', minHeight: '60px', border: '1px solid #1a1a1a', fontFamily: 'var(--mono)', lineHeight: '1.6' }}>
                          {s.llm_user_prompt || <span style={{ italic: 'true', color: '#333' }}>No instruction...</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '20px' }}>
                       <span style={{ fontSize: '10px', color: '#444', fontWeight: 'bold' }}>TEMP <span style={{ color: '#6366f1' }}>{s.llm_temperature}</span></span>
                       <span style={{ fontSize: '10px', color: '#444', fontWeight: 'bold' }}>MODEL <span style={{ color: '#6366f1' }}>{s.llm_model_id}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testing Studio */}
            <div style={{ ...glassPanel, padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Simulation Studio</h3>
                <button
                  onClick={testFlavor}
                  disabled={testLoading || !selectedImageId}
                  style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                >
                  {testLoading ? 'Processing...' : 'Run Simulation'}
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', color: '#444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>Source Input</div>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
                  {images.slice(0, 15).map(img => (
                    <div key={img.id} onClick={() => setSelectedImageId(img.id)} style={{
                      flexShrink: 0, width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden',
                      border: selectedImageId === img.id ? '2px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.2s', transform: selectedImageId === img.id ? 'scale(1.05)' : 'scale(1)'
                    }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: selectedImageId === img.id ? 1 : 0.4 }} />
                    </div>
                  ))}
                </div>
              </div>

              {testError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{testError}</div>}

              <div style={{ background: '#070707', borderRadius: '12px', padding: '24px', border: '1px solid #1a1a1a' }}>
                {testResults.length > 0 ? testResults.map((r, i) => (
                  <div key={i} style={{ fontSize: '15px', color: '#fff', lineHeight: '1.6', marginBottom: '12px', borderLeft: '2px solid #6366f1', paddingLeft: '16px' }}>
                    {r.content ?? r}
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#333', fontSize: '12px', fontWeight: 'bold' }}>READY FOR TEST EXECUTION</div>
                )}
              </div>
            </div>

            {/* Production Log */}
            <div style={glassPanel}>
               <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: '900', color: '#444', textTransform: 'uppercase' }}>History Log</div>
               <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                 {flavorCaptions.map(c => (
                   <div key={c.id} style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '12px', color: '#666' }}>{c.content}</div>
                 ))}
               </div>
            </div>

          </div>
        ) : (
          <div style={{ ...glassPanel, padding: '100px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚡</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#444' }}>SELECT A MODEL FROM THE LIBRARY</div>
          </div>
        )}
      </div>

      {/* --- MODALS (STYLED FOR THE NEW VIBE) --- */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '480px', padding: '40px', background: '#0a0a0a' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '32px' }}>{flavorModal === 'create' ? 'Register New Flavor' : 'Update Flavor Meta'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>Identifier (Slug)</div>
                <input style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '14px', outline: 'none' }} value={flavorForm.slug} onChange={e => setFlavorForm(v => ({ ...v, slug: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>Description</div>
                <textarea style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '14px', outline: 'none', height: '80px' }} value={flavorForm.description} onChange={e => setFlavorForm(v => ({ ...v, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
               <button onClick={() => setFlavorModal(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
               <button onClick={saveFlavor} style={{ flex: 1, background: '#6366f1', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* [Similar styling applies to Step modals—I'll keep the textarea larger for prompts] */}
      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '600px', padding: '40px', background: '#0a0a0a', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '32px' }}>{stepModal === 'create' ? 'Node Initialization' : 'Configure Node'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <input placeholder="Step Description" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.description} onChange={e => setStepForm(v => ({ ...v, description: e.target.value }))} />

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input placeholder="Temp (0.7)" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.llm_temperature} onChange={e => setStepForm(v => ({ ...v, llm_temperature: e.target.value }))} />
                  <input placeholder="Model ID" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.llm_model_id} onChange={e => setStepForm(v => ({ ...v, llm_model_id: e.target.value }))} />
               </div>

               <div>
                 <div style={{ fontSize: '9px', fontWeight: '900', color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>System Prompt</div>
                 <textarea style={{ width: '100%', background: '#070707', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#aaa', fontSize: '12px', fontFamily: 'var(--mono)', height: '120px', outline: 'none' }} value={stepForm.llm_system_prompt} onChange={e => setStepForm(v => ({ ...v, llm_system_prompt: e.target.value }))} />
               </div>

               <div>
                 <div style={{ fontSize: '9px', fontWeight: '900', color: '#444', textTransform: 'uppercase', marginBottom: '8px' }}>User Prompt</div>
                 <textarea style={{ width: '100%', background: '#070707', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#aaa', fontSize: '12px', fontFamily: 'var(--mono)', height: '120px', outline: 'none' }} value={stepForm.llm_user_prompt} onChange={e => setStepForm(v => ({ ...v, llm_user_prompt: e.target.value }))} />
               </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
               <button onClick={() => setStepModal(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Discard</button>
               <button onClick={saveStep} style={{ flex: 1, background: '#6366f1', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Deploy Node'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation (Flavor or Step) */}
      {(flavorModal === 'delete' || stepModal === 'delete') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ ...glassPanel, width: '400px', padding: '40px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ef4444', marginBottom: '16px' }}>Destructive Action</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>This will permanently remove this item from the infrastructure. Continue?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
               <button onClick={() => { setFlavorModal(null); setStepModal(null); }} style={{ flex: 1, background: '#111', border: 'none', color: '#888', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Abort</button>
               <button onClick={flavorModal === 'delete' ? deleteFlavor : deleteStep} style={{ flex: 1, background: '#ef4444', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}