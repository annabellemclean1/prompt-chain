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
    llm_temperature: '0.7', llm_model_id: '', humor_flavor_step_type_id: '',
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
    loadFlavors()
    loadImages()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
    })
  }, [])

  useEffect(() => {
    if (selectedFlavor) {
      loadSteps(selectedFlavor.id)
      loadFlavorCaptions(selectedFlavor.id)
    }
  }, [selectedFlavor])

  const loadFlavors = async () => {
    setLoading(true)
    const { data } = await supabase.from('humor_flavors').select('*').order('id')
    setFlavors(data || [])
    setLoading(false)
  }

  const loadSteps = async (flavorId: number) => {
    const { data } = await supabase.from('humor_flavor_steps').select('*')
      .eq('humor_flavor_id', flavorId).order('order_by')
    setSteps(data || [])
  }

  const loadFlavorCaptions = async (flavorId: number) => {
    setCaptionsLoading(true)
    const { data } = await supabase.from('captions').select('id, content')
      .eq('humor_flavor_id', flavorId).order('created_datetime_utc', { ascending: false }).limit(20)
    setFlavorCaptions(data || [])
    setCaptionsLoading(false)
  }

  const loadImages = async () => {
    const { data } = await supabase.from('images').select('id, url').limit(50)
    setImages(data || [])
    if (data && data.length > 0) setSelectedImageId(data[0].id)
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
    if (!selectedFlavor) return
    setSaving(true)
    const { error: e } = await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); setSelectedFlavor(null); setSteps([]); loadFlavors()
  }

  const openCreateStep = () => {
    setStepForm({
      description: '', llm_system_prompt: '', llm_user_prompt: '',
      llm_temperature: '0.7', llm_model_id: '6', humor_flavor_step_type_id: '1',
      llm_input_type_id: '1', llm_output_type_id: '1'
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
      llm_output_type_id: String(s.llm_output_type_id ?? '1'),
    })
    setError(''); setStepModal('edit')
  }

  const openDeleteStep = (s: Step) => { setSelectedStep(s); setError(''); setStepModal('delete') }

  const saveStep = async () => {
    if (!selectedFlavor) return
    setSaving(true); setError('')
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) : 0
    const payload: any = {
      humor_flavor_id: selectedFlavor.id,
      description: stepForm.description || null,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: stepForm.llm_temperature ? Number(stepForm.llm_temperature) : null,
      llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
      humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : 1,
      llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : 1,
      llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : 1,
    }
    if (stepModal === 'create') payload.order_by = maxOrder + 1
    const { error: e } = stepModal === 'create'
      ? await supabase.from('humor_flavor_steps').insert(payload)
      : await supabase.from('humor_flavor_steps').update(payload).eq('id', selectedStep!.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setStepModal(null); loadSteps(selectedFlavor.id)
  }

  const deleteStep = async () => {
    if (!selectedStep || !selectedFlavor) return
    setSaving(true)
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
    } catch (e: any) { setTestError(e.message) }
    setTestLoading(false)
  }

  const panel = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px' }

  return (
    <div style={{ padding: '24px 28px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-dimmer)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4px' }}>Humor Flavor Manager</div>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: '24px', fontWeight: '800', color: 'var(--text)' }}>Prompt Chain Tool</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* LEFT: Flavor List */}
        <div style={panel}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Humor Flavors</span>
            <button className="btn btn-primary" onClick={openCreateFlavor} style={{ padding: '3px 10px' }}>+</button>
          </div>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '11px' }}>Loading…</div>
          ) : flavors.map(f => (
            <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{
              padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
              background: selectedFlavor?.id === f.id ? 'var(--bg-hover)' : 'transparent',
              borderLeft: selectedFlavor?.id === f.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' }}>{f.slug}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || 'No description'}</div>
            </div>
          ))}
          {flavors.length === 0 && !loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '11px' }}>No flavors yet.</div>
          )}
        </div>

        {/* RIGHT */}
        {selectedFlavor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Flavor Header */}
            <div style={{ ...panel, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-dimmer)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>Flavor #{selectedFlavor.id}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '20px', fontWeight: '800', color: 'var(--accent)', marginBottom: '4px' }}>{selectedFlavor.slug}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{selectedFlavor.description || 'No description'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn" onClick={() => openEditFlavor(selectedFlavor)}>Edit</button>
                  <button className="btn btn-danger" onClick={openDeleteFlavor}>Delete</button>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={panel}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Steps ({steps.length})</span>
                <button className="btn btn-primary" onClick={openCreateStep}>+ Add Step</button>
              </div>
              {steps.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '11px' }}>No steps yet.</div>
              )}
              {steps.map((s, idx) => (
                <div key={s.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>Step {s.order_by}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{s.description || 'Untitled step'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn" onClick={() => moveStep(s, 'up')} disabled={idx === 0} style={{ padding: '3px 8px' }}>↑</button>
                      <button className="btn" onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1} style={{ padding: '3px 8px' }}>↓</button>
                      <button className="btn" onClick={() => openEditStep(s)} style={{ padding: '3px 10px' }}>Edit</button>
                      <button className="btn btn-danger" onClick={() => openDeleteStep(s)} style={{ padding: '3px 10px' }}>Del</button>
                    </div>
                  </div>
                  {s.llm_system_prompt && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-dimmer)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>System Prompt</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto' }}>{s.llm_system_prompt}</div>
                    </div>
                  )}
                  {s.llm_user_prompt && (
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-dimmer)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>User Prompt</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto' }}>{s.llm_user_prompt}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {s.llm_temperature != null && <span style={{ fontSize: '10px', color: 'var(--text-dimmer)' }}>temp: <span style={{ color: 'var(--teal)' }}>{s.llm_temperature}</span></span>}
                    {s.llm_model_id != null && <span style={{ fontSize: '10px', color: 'var(--text-dimmer)' }}>model: <span style={{ color: 'var(--blue)' }}>{s.llm_model_id}</span></span>}
                    {s.llm_input_type_id != null && <span style={{ fontSize: '10px', color: 'var(--text-dimmer)' }}>in: <span style={{ color: 'var(--text-dim)' }}>{s.llm_input_type_id}</span></span>}
                    {s.llm_output_type_id != null && <span style={{ fontSize: '10px', color: 'var(--text-dimmer)' }}>out: <span style={{ color: 'var(--text-dim)' }}>{s.llm_output_type_id}</span></span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Test Flavor */}
            <div style={panel}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Test Flavor</span>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Select Test Image</div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {images.slice(0, 10).map(img => (
                      <div key={img.id} onClick={() => setSelectedImageId(img.id)} style={{
                        flexShrink: 0, width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden',
                        border: selectedImageId === img.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                        cursor: 'pointer'
                      }}>
                        <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={testFlavor} disabled={testLoading || !selectedImageId} style={{ marginBottom: '12px' }}>
                  {testLoading ? 'Generating…' : `Test "${selectedFlavor.slug}" →`}
                </button>
                {testError && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>{testError}</div>}
                {testResults.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Generated Captions</div>
                    {testResults.map((r, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
                        {r.content ?? r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Captions */}
            <div style={panel}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Captions Produced by This Flavor</span>
              </div>
              {captionsLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '11px' }}>Loading…</div>
              ) : flavorCaptions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '11px' }}>No captions yet for this flavor.</div>
              ) : flavorCaptions.map(c => (
                <div key={c.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--sans)' }}>
                  {c.content}
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div style={{ ...panel, padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>←</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dimmer)' }}>Select a humor flavor to view and edit its steps</div>
          </div>
        )}
      </div>

      {/* Flavor Modals */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '440px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>{flavorModal === 'create' ? 'New Humor Flavor' : 'Edit Humor Flavor'}</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', marginBottom: '16px', fontSize: '12px', borderRadius: '4px' }}>{error}</div>}
            {[['slug', 'Slug'], ['description', 'Description']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
                <input className="input" value={(flavorForm as any)[k]} onChange={e => setFlavorForm(v => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFlavor} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {flavorModal === 'delete' && selectedFlavor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '380px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Delete Flavor?</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>Delete <span style={{ color: 'var(--accent)' }}>{selectedFlavor.slug}</span> and all its steps? This cannot be undone.</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', marginBottom: '12px', fontSize: '12px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteFlavor} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Step Modals */}
      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '540px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>{stepModal === 'create' ? 'New Step' : 'Edit Step'}</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', marginBottom: '16px', fontSize: '12px', borderRadius: '4px' }}>{error}</div>}
            {([
              ['description', 'Description', false],
              ['llm_system_prompt', 'System Prompt', true],
              ['llm_user_prompt', 'User Prompt', true],
              ['llm_temperature', 'Temperature', false],
              ['llm_model_id', 'LLM Model ID', false],
              ['humor_flavor_step_type_id', 'Step Type ID', false],
              ['llm_input_type_id', 'Input Type ID', false],
              ['llm_output_type_id', 'Output Type ID', false],
            ] as [string, string, boolean][]).map(([k, l, isTextarea]) => (
              <div key={k} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
                {isTextarea
                  ? <textarea className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} style={{ minHeight: '100px' }} />
                  : <input className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} />
                }
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn" onClick={() => setStepModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStep} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {stepModal === 'delete' && selectedStep && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '360px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Delete Step?</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>Delete <span style={{ color: 'var(--accent)' }}>Step {selectedStep.order_by}</span>? This cannot be undone.</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', marginBottom: '12px', fontSize: '12px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setStepModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteStep} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}