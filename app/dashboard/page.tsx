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
      loadFlavorCaptions(selectedFlavor.id) // Refresh history after test
    } catch (e: any) { setTestError(e.message) }
    setTestLoading(false)
  }

  const glassPanel = { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }

  return (
    <div style={{ padding: '40px 60px', minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--sans)' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Model Pipeline</div>
        <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em' }}>Prompt Chain <span style={{ color: '#6366f1' }}>Tool</span></h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px', alignItems: 'start' }}>

        {/* LEFT: FLAVORS */}
        <div style={glassPanel}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>Flavors</span>
            <button onClick={openCreateFlavor} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '11px' }}>Syncing...</div>
          ) : flavors.map(f => (
            <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{
              padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: selectedFlavor?.id === f.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              borderLeft: selectedFlavor?.id === f.id ? '3px solid #6366f1' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: selectedFlavor?.id === f.id ? '#6366f1' : '#ccc' }}>{f.slug}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || 'No description'}</div>
            </div>
          ))}
        </div>

        {/* RIGHT: MAIN */}
        {selectedFlavor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Flavor Header */}
            <div style={{ ...glassPanel, padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Active Config</div>
                  <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px' }}>{selectedFlavor.slug}</h2>
                  <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.6' }}>{selectedFlavor.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }} onClick={() => openEditFlavor(selectedFlavor)}>Edit</button>
                  <button style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }} onClick={openDeleteFlavor}>Delete</button>
                </div>
              </div>
            </div>

            {/* Workflow Sequence */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#444', textTransform: 'uppercase' }}>Workflow Sequence</span>
                <button onClick={openCreateStep} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>+ ADD STEP</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {steps.map((s, idx) => (
                  <div key={s.id} style={{ ...glassPanel, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>{idx + 1}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{s.description || 'Node'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: '#222', border: 'none', color: '#666', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => moveStep(s, 'up')} disabled={idx === 0}>↑</button>
                        <button style={{ background: '#222', border: 'none', color: '#666', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1}>↓</button>
                        <button style={{ background: '#222', border: 'none', color: '#6366f1', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} onClick={() => openEditStep(s)}>Edit</button>
                      </div>
                    </div>
                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>System Prompt</div>
                        <div style={{ background: '#070707', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#aaa', border: '1px solid #1a1a1a', fontFamily: 'var(--mono)', minHeight: '60px' }}>
                          {s.llm_system_prompt || <span style={{ fontStyle: 'italic', color: '#333' }}>Empty context</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>User Prompt</div>
                        <div style={{ background: '#070707', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#aaa', border: '1px solid #1a1a1a', fontFamily: 'var(--mono)', minHeight: '60px' }}>
                          {s.llm_user_prompt || <span style={{ fontStyle: 'italic', color: '#333' }}>Empty instruction</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sandbox / Testing */}
            <div style={{ ...glassPanel, padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Sandbox Execution</h3>
                <button onClick={testFlavor} disabled={testLoading} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>
                  {testLoading ? 'Generating...' : 'Run Pipeline'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
                {images.slice(0, 15).map(img => (
                  <img key={img.id} src={img.url} onClick={() => setSelectedImageId(img.id)} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: selectedImageId === img.id ? '2px solid #6366f1' : '2px solid transparent', opacity: selectedImageId === img.id ? 1 : 0.4 }} />
                ))}
              </div>
              <div style={{ background: '#070707', borderRadius: '12px', padding: '24px', border: '1px solid #1a1a1a' }}>
                {testResults.length > 0 ? testResults.map((r, i) => (
                  <div key={i} style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #6366f1', lineHeight: '1.5' }}>
                    {typeof r === 'string' ? r : (r.content ?? JSON.stringify(r))}
                  </div>
                )) : <div style={{ color: '#333', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }}>NO REAL-TIME LOGS</div>}
              </div>
            </div>

            {/* Production History (THE FIX IS HERE) */}
            <div style={glassPanel}>
               <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: '900', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>History: Captions Produced by This Flavor</div>
               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 {captionsLoading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#333', fontSize: '11px' }}>SYNCING HISTORY...</div>
                 ) : flavorCaptions.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#333', fontSize: '11px' }}>NO PERMANENT RECORDS FOUND</div>
                 ) : flavorCaptions.map(c => (
                   <div key={c.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13px', color: '#ccc', lineHeight: '1.5' }}>
                     {c.content}
                   </div>
                 ))}
               </div>
            </div>

          </div>
        ) : (
          <div style={{ ...glassPanel, padding: '100px', textAlign: 'center', opacity: 0.3 }}>
            <div style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.2em' }}>SELECT MODEL CONFIGURATION</div>
          </div>
        )}
      </div>

      {/* MODALS (Simplified for brevity but identical logic) */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '440px', padding: '40px', background: '#0a0a0a' }}>
             <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '24px' }}>Flavor Configuration</h3>
             <input placeholder="Slug" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', marginBottom: '16px', outline: 'none' }} value={flavorForm.slug} onChange={e => setFlavorForm(v => ({...v, slug: e.target.value}))} />
             <textarea placeholder="Description" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', height: '100px', outline: 'none' }} value={flavorForm.description} onChange={e => setFlavorForm(v => ({...v, description: e.target.value}))} />
             <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setFlavorModal(null)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#888', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveFlavor} style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
             </div>
          </div>
        </div>
      )}

      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...glassPanel, width: '580px', padding: '40px', background: '#0a0a0a', maxHeight: '90vh', overflowY: 'auto' }}>
             <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '24px' }}>Step Logic</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <input placeholder="Description" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.description} onChange={e => setStepForm(v => ({...v, description: e.target.value}))} />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input placeholder="Temperature" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.llm_temperature} onChange={e => setStepForm(v => ({...v, llm_temperature: e.target.value}))} />
                  <input placeholder="Model ID" style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }} value={stepForm.llm_model_id} onChange={e => setStepForm(v => ({...v, llm_model_id: e.target.value}))} />
               </div>
               <textarea placeholder="System Prompt" style={{ width: '100%', background: '#070707', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', height: '120px', fontFamily: 'var(--mono)', outline: 'none' }} value={stepForm.llm_system_prompt} onChange={e => setStepForm(v => ({...v, llm_system_prompt: e.target.value}))} />
               <textarea placeholder="User Prompt" style={{ width: '100%', background: '#070707', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', height: '120px', fontFamily: 'var(--mono)', outline: 'none' }} value={stepForm.llm_user_prompt} onChange={e => setStepForm(v => ({...v, llm_user_prompt: e.target.value}))} />
             </div>
             <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setStepModal(null)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#888', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveStep} style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Deploy</button>
             </div>
          </div>
        </div>
      )}

      {(flavorModal === 'delete' || stepModal === 'delete') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ ...glassPanel, width: '360px', padding: '40px', textAlign: 'center' }}>
            <h3 style={{ color: '#ef4444', fontWeight: '900', marginBottom: '12px' }}>Confirm Deletion</h3>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>This action is permanent.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setFlavorModal(null); setStepModal(null); }} style={{ flex: 1, background: '#111', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={flavorModal === 'delete' ? deleteFlavor : deleteStep} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}