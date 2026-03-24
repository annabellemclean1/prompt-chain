'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Play, ChevronUp, ChevronDown, Edit3,
  Trash2, Zap, Terminal, Layers, Image as ImageIcon,
  Loader2, X, AlertCircle, CheckCircle2
} from 'lucide-react'

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

  // --- STATE ---
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

  // --- EFFECTS ---
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

  // --- LOGIC ---
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

  // --- RENDER ---
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Layers className="text-indigo-500" size={24} /> Prompt Chain Lab
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-wider">Humor Flavor Manager v2.0</p>
        </div>
        <button
          onClick={openCreateFlavor}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus size={16} /> NEW FLAVOR
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">

        {/* LEFT: FLAVOR LIST */}
        <div className="col-span-3 space-y-4 sticky top-24">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 flex justify-between">
            <span>Library</span>
            <span>{flavors.length} items</span>
          </div>
          <div className="bg-[#0f0f11] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={20} />
                <span className="text-[10px] text-slate-600 font-mono">SCANNING...</span>
              </div>
            ) : flavors.map(f => (
              <div
                key={f.id}
                onClick={() => setSelectedFlavor(f)}
                className={`group px-5 py-4 cursor-pointer border-b border-white/5 last:border-0 transition-all
                  ${selectedFlavor?.id === f.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold transition-colors ${selectedFlavor?.id === f.id ? 'text-indigo-400' : 'text-slate-300 group-hover:text-white'}`}>
                    {f.slug}
                  </span>
                  {selectedFlavor?.id === f.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 truncate font-mono italic">
                  {f.description || 'no_description_provided'}
                </div>
              </div>
            ))}
            {!loading && flavors.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-600 italic">No flavors found.</div>
            )}
          </div>
        </div>

        {/* RIGHT: EDITOR */}
        <div className="col-span-9">
          {selectedFlavor ? (
            <div className="space-y-8">

              {/* Flavor Summary Card */}
              <div className="bg-gradient-to-br from-[#0f0f11] to-[#0a0a0b] p-8 rounded-3xl border border-white/5 shadow-2xl flex justify-between items-center group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Zap size={120} />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-mono text-indigo-400 mb-2 tracking-widest uppercase">Active Configuration</div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">{selectedFlavor.slug}</h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">{selectedFlavor.description || 'Edit this flavor to add a description.'}</p>
                </div>
                <div className="flex gap-3 relative z-10">
                  <button onClick={() => openEditFlavor(selectedFlavor)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all active:scale-90 border border-white/5"><Edit3 size={18} /></button>
                  <button onClick={openDeleteFlavor} className="p-3 bg-red-500/5 hover:bg-red-500/20 rounded-xl text-red-400 transition-all active:scale-90 border border-red-500/10"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* Steps Timeline */}
              <div className="space-y-4">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Chain Sequence</div>
                 <div className="relative pl-8 space-y-6">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-indigo-500 via-slate-800 to-transparent opacity-20" />

                    {steps.map((s, idx) => (
                      <div key={s.id} className="relative group">
                        {/* Circle Indicator */}
                        <div className="absolute -left-[25px] top-6 h-4 w-4 rounded-full bg-[#0a0a0b] border-2 border-indigo-500/50 group-hover:border-indigo-400 transition-colors z-10" />

                        <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/20 transition-all shadow-lg group-hover:shadow-indigo-500/5">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black font-mono text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded tracking-tighter uppercase">Step {s.order_by}</span>
                              <h3 className="text-sm font-bold text-slate-200">{s.description || 'Untitled Process'}</h3>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              <button onClick={() => moveStep(s, 'up')} disabled={idx === 0} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={16}/></button>
                              <button onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={16}/></button>
                              <button onClick={() => openEditStep(s)} className="p-1.5 text-indigo-400 hover:text-indigo-300 ml-2"><Edit3 size={16}/></button>
                              <button onClick={() => openDeleteStep(s)} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">System Prompt</label>
                              <div className="bg-black/50 rounded-xl p-4 border border-white/5 min-h-[80px] text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                                {s.llm_system_prompt || <span className="opacity-20 italic">No system instructions set...</span>}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">User Prompt Template</label>
                              <div className="bg-black/50 rounded-xl p-4 border border-white/5 min-h-[80px] text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                                {s.llm_user_prompt || <span className="opacity-20 italic">No user prompt set...</span>}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/5 flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-600 uppercase font-bold">Temp</span>
                                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{s.llm_temperature}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-600 uppercase font-bold">Model</span>
                                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">ID: {s.llm_model_id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Step Action */}
                    <div className="pt-2">
                      <button
                        onClick={openCreateStep}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all w-full group"
                      >
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                          <Plus size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">Append new step to chain</span>
                      </button>
                    </div>
                 </div>
              </div>

              {/* CONSOLE / TEST AREA */}
              <div className="bg-[#050505] rounded-3xl border border-emerald-500/20 overflow-hidden shadow-2xl">
                <div className="bg-emerald-500/5 px-8 py-4 border-b border-emerald-500/10 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <Terminal size={18} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Execution Console</span>
                  </div>
                  <button
                    onClick={testFlavor}
                    disabled={testLoading || !selectedImageId}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/10 disabled:opacity-20 active:scale-95"
                  >
                    {testLoading ? <Loader2 className="animate-spin" size={12}/> : <Play size={12} fill="currentColor"/>}
                    {testLoading ? 'Running Pipeline...' : 'Run Test Cycle'}
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  {/* Image Strip */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      <ImageIcon size={12} /> Input Reference
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {images.slice(0, 12).map(img => (
                        <div
                          key={img.id}
                          onClick={() => setSelectedImageId(img.id)}
                          className={`flex-none w-20 h-20 rounded-xl overflow-hidden border-2 transition-all transform active:scale-90 cursor-pointer
                            ${selectedImageId === img.id ? 'border-emerald-500 scale-105 shadow-xl ring-4 ring-emerald-500/10' : 'border-transparent grayscale opacity-30 hover:grayscale-0 hover:opacity-100'}`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Output */}
                  <div className="min-h-[160px] bg-black/60 rounded-2xl border border-white/5 p-6 font-mono text-[13px] relative">
                    <div className="absolute top-4 right-4 text-[10px] text-slate-800 font-bold uppercase tracking-widest">stdout_output</div>
                    {testError && (
                      <div className="flex items-start gap-3 text-red-400 bg-red-400/5 p-4 rounded-xl border border-red-400/10 animate-in shake duration-300">
                        <AlertCircle size={16} className="mt-0.5" />
                        <div>
                          <div className="font-bold mb-1 underline">CRITICAL_SYSTEM_ERROR</div>
                          <p className="text-xs opacity-80">{testError}</p>
                        </div>
                      </div>
                    )}

                    {testResults.length > 0 ? (
                      <div className="space-y-4">
                        {testResults.map((r, i) => (
                          <div key={i} className="flex gap-4 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <span className="text-slate-700 font-bold shrink-0">[{i}] &gt;</span>
                            <div className="text-emerald-400/90 leading-relaxed bg-emerald-400/5 px-3 py-1 rounded-md border border-emerald-400/5 group-hover:border-emerald-400/20 transition-all">
                              {r.content ?? r}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !testLoading && (
                      <div className="flex flex-col items-center justify-center py-8 opacity-20">
                        <Zap size={32} className="mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Awaiting Execution Command</p>
                      </div>
                    )}

                    {testLoading && (
                      <div className="flex flex-col items-center justify-center py-8 animate-pulse">
                        <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em]">Processing Chain Logic...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="bg-[#0f0f11] rounded-3xl border border-white/5 overflow-hidden">
                <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                     <CheckCircle2 size={14} className="text-slate-500" /> Recent Deployments
                   </span>
                   {captionsLoading && <Loader2 className="animate-spin text-slate-600" size={14} />}
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {flavorCaptions.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-600 font-mono italic">No production logs found for this sequence.</div>
                  ) : flavorCaptions.map(c => (
                    <div key={c.id} className="px-8 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors flex items-start gap-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-700 mt-2 flex-none" />
                      <p className="text-[12px] text-slate-400 font-sans leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* EMPTY STATE */
            <div className="h-[70vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] text-slate-600 bg-white/[0.01]">
              <div className="relative mb-6">
                <Layers size={64} className="opacity-10" />
                <Zap className="absolute -bottom-2 -right-2 text-indigo-500/20 animate-pulse" size={32} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500">System Ready</h3>
              <p className="text-xs font-mono mt-2 opacity-40 italic">Select a logic flavor from the library to begin editing.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Flavor Create/Edit */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0f11] border border-white/10 rounded-[32px] w-full max-w-[480px] p-8 shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-xl font-bold text-white">{flavorModal === 'create' ? 'Create Flavor' : 'Update Flavor'}</h3>
              <button onClick={() => setFlavorModal(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            <div className="space-y-6">
              {error && <div className="bg-red-500/5 text-red-400 p-4 rounded-2xl border border-red-500/10 text-xs flex items-center gap-2 font-mono"><AlertCircle size={14}/> {error}</div>}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Identifier Slug</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                  placeholder="e.g., sarcastic_observer"
                  value={flavorForm.slug}
                  onChange={e => setFlavorForm(v => ({ ...v, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Description</label>
                <textarea
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700 min-h-[100px]"
                  placeholder="Define the behavior of this humor profile..."
                  value={flavorForm.description}
                  onChange={e => setFlavorForm(v => ({ ...v, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setFlavorModal(null)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Discard</button>
                <button
                  onClick={saveFlavor}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Commit Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Create/Edit */}
      {(stepModal === 'create' || stepModal === 'edit') && (
        <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0f11] border border-white/10 rounded-[32px] w-full max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">{stepModal === 'create' ? 'Append Logic Step' : 'Modify Step Configuration'}</h3>
              <button onClick={() => setStepModal(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
              {error && <div className="bg-red-500/5 text-red-400 p-4 rounded-2xl border border-red-500/10 text-xs flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Description</label>
                <input className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={stepForm.description} onChange={e => setStepForm(v => ({ ...v, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 text-emerald-500/70">Temperature</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={stepForm.llm_temperature} onChange={e => setStepForm(v => ({ ...v, llm_temperature: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 text-indigo-500/70">Model Identifier</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={stepForm.llm_model_id} onChange={e => setStepForm(v => ({ ...v, llm_model_id: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">System Instructions (Context)</label>
                <textarea className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px]"
                  value={stepForm.llm_system_prompt} onChange={e => setStepForm(v => ({ ...v, llm_system_prompt: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">User Prompt (Execution)</label>
                <textarea className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/5 min-h-[120px]"
                  value={stepForm.llm_user_prompt} onChange={e => setStepForm(v => ({ ...v, llm_user_prompt: e.target.value }))} />
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex gap-3 bg-black/20">
              <button onClick={() => setStepModal(null)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Discard</button>
              <button onClick={saveStep} disabled={saving} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/20">
                {saving ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Update Sequence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {(flavorModal === 'delete' || stepModal === 'delete') && (
        <div className="fixed inset-0 bg-[#000]/90 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0f11] border border-red-500/20 rounded-[32px] w-full max-w-[400px] p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center animate-in zoom-in-95">
            <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 ring-4 ring-red-500/5">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-mono uppercase tracking-tighter">Irreversible Action</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed italic font-mono">
              Are you sure you want to purge <span className="text-red-400 font-bold">"{flavorModal === 'delete' ? selectedFlavor?.slug : selectedStep?.description}"</span>? All associated data streams will be permanently erased.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setFlavorModal(null); setStepModal(null); }} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Abort</button>
              <button
                onClick={flavorModal === 'delete' ? deleteFlavor : deleteStep}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
              >
                {saving ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  )
}