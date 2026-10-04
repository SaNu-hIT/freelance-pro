'use client'

import { useEffect, useRef, useState, ClipboardEvent, DragEvent } from 'react'
import {
  ClipboardList, Plus, ChevronDown, MessageSquare, Image as ImageIcon, RotateCcw, Lock, HelpCircle,
  CheckCircle2, Trash2, X, Send, Monitor, Smartphone,
} from 'lucide-react'
import { correctionsApi, documentsApi, pagesApi } from '@/lib/api'
import { Correction, CorrectionPriority, CorrectionStatus, CorrectionViewport, ProjectPage } from '@/lib/types'
import { useAuthStore } from '@/lib/store'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const STATUS_LABEL: Record<CorrectionStatus, string> = {
  open: 'Open', triaged: 'Triaged', needs_info: 'Needs info', in_progress: 'In progress',
  fixed: 'Fixed', confirmed: 'Confirmed', reopened: 'Reopened', wontfix: "Won't fix",
}
const STATUSES = Object.keys(STATUS_LABEL) as CorrectionStatus[]

const FILTERS: { key: string; label: string; statuses: CorrectionStatus[] | null }[] = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'active', label: 'Active', statuses: ['open', 'triaged', 'in_progress', 'reopened'] },
  { key: 'needs_info', label: 'Needs info', statuses: ['needs_info'] },
  { key: 'fixed', label: 'Fixed', statuses: ['fixed'] },
  { key: 'closed', label: 'Closed', statuses: ['confirmed', 'wontfix'] },
]

const MAX_SHOTS = 5
const fmtWhen = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Corrections the client asks for on the delivered website, with screenshots and a thread per correction.
// The same panel serves the team (triage, status, questions) and the client (report, answer, confirm).
export function CorrectionsPanel({ projectId }: { projectId: string }) {
  const user = useAuthStore(s => s.user)
  const isClient = user?.role === 'client'
  const [items, setItems] = useState<Correction[]>([])
  const [pages, setPages] = useState<ProjectPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [composing, setComposing] = useState(false)
  const [filter, setFilter] = useState(isClient ? 'all' : 'active')
  const [pageFilter, setPageFilter] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([correctionsApi.list(projectId), pagesApi.list(projectId)])
      .then(([c, p]) => { setItems(c.data); setPages((p.data as ProjectPage[]).filter(pg => !pg.archived)) })
      .catch(err => setError(apiError(err, 'Could not load corrections.')))
      .finally(() => setLoading(false))
  }, [projectId])

  const replace = (c: Correction) => setItems(prev => prev.map(x => (x.id === c.id ? c : x)))

  // What waits on the person looking: clients answer questions and check fixes; the team handles the rest
  const waitingOnMe = (c: Correction) => isClient
    ? c.status === 'needs_info' || c.status === 'fixed'
    : c.status === 'open' || c.status === 'reopened'

  const statuses = FILTERS.find(f => f.key === filter)?.statuses
  const visible = items.filter(c =>
    (!statuses || statuses.includes(c.status)) &&
    (!pageFilter || (pageFilter === 'site' ? !c.pageId : c.pageId === pageFilter)))
  const waiting = items.filter(waitingOnMe).length
  const repeats = items.filter(c => c.reopenCount > 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <ClipboardList size={15} style={{ color: 'var(--fg)' }} />
        <h2 className="text-sm font-bold text-primary-ui">Corrections</h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {items.length} total{waiting > 0 && ` · ${waiting} waiting on ${isClient ? 'you' : 'the team'}`}
          {repeats > 0 && ` · ${repeats} reopened`}
        </span>
        <button type="button" onClick={() => setComposing(true)} disabled={composing}
          className="btn-primary ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50">
          <Plus size={13} /> Report correction
        </button>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      {composing && (
        <NewCorrection projectId={projectId} pages={pages} onCancel={() => setComposing(false)} onError={setError}
          onCreated={c => { setItems(prev => [c, ...prev]); setComposing(false); setOpen(c.id) }} />
      )}

      {items.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => {
            const n = f.statuses ? items.filter(c => f.statuses!.includes(c.status)).length : items.length
            return (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                className="px-2.5 py-1 rounded-full text-xs transition-colors"
                style={{
                  background: filter === f.key ? 'rgb(var(--fg-rgb) / 0.12)' : 'transparent',
                  border: `1px solid ${filter === f.key ? 'rgb(var(--fg-rgb) / 0.35)' : 'var(--border)'}`,
                  color: filter === f.key ? 'var(--fg)' : 'var(--text-muted)',
                }}>
                {f.label} <span className="tabular-nums">{n}</span>
              </button>
            )
          })}
          {pages.length > 0 && (
            <select className="input-field py-1 text-xs w-auto ml-auto max-w-[220px]" aria-label="Filter by page"
              value={pageFilter} onChange={e => setPageFilter(e.target.value)}>
              <option value="">All pages</option>
              <option value="site">Whole site</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.path}</option>)}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        !composing && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            {isClient
              ? <>Spotted something to change on the site? Use <strong>Report correction</strong>, pick the page and add a screenshot.</>
              : 'No corrections yet. The client reports them from their portal, or add one here on their behalf.'}
          </p>
        )
      ) : visible.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nothing here with this filter.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(c => (
            <CorrectionCard key={c.id} c={c} expanded={open === c.id} highlight={waitingOnMe(c)}
              onToggle={() => setOpen(o => (o === c.id ? null : c.id))}
              onChange={replace} onDeleted={() => setItems(prev => prev.filter(x => x.id !== c.id))} onError={setError} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: CorrectionStatus }) {
  const strong = status === 'needs_info' || status === 'fixed' || status === 'reopened'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{
        background: strong ? 'rgb(var(--fg-rgb) / 0.14)' : 'var(--bg-elevated)',
        border: `1px solid ${strong ? 'rgb(var(--fg-rgb) / 0.35)' : 'var(--border)'}`,
        color: status === 'confirmed' || status === 'wontfix' ? 'var(--text-muted)' : 'var(--fg)',
      }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function NewCorrection({ projectId, pages, onCancel, onCreated, onError }: {
  projectId: string
  pages: ProjectPage[]
  onCancel: () => void
  onCreated: (c: Correction) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({ pageId: '', title: '', body: '', priority: 'normal' as CorrectionPriority, viewport: '' as CorrectionViewport | '' })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | File[]) => {
    const images = Array.from(list).filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    setFiles(prev => [...prev, ...images].slice(0, MAX_SHOTS))
  }
  const onPaste = (e: ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData.files)
    if (pasted.some(f => f.type.startsWith('image/'))) { e.preventDefault(); addFiles(pasted) }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files) }

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Add a short title and describe the change.'); return }
    setSaving(true)
    setError('')
    let created: Correction
    try {
      const res = await correctionsApi.create({
        projectId, title: form.title.trim(), body: form.body.trim(), priority: form.priority,
        ...(form.pageId && { pageId: form.pageId }),
        ...(form.viewport && { viewport: form.viewport }),
      })
      created = res.data
    } catch (err) {
      setError(apiError(err, 'Could not report the correction.'))
      setSaving(false)
      return
    }
    // The correction is saved; screenshots follow one by one
    const shots = [...created.screenshots]
    for (const file of files) {
      try {
        shots.push((await correctionsApi.addScreenshot(created.id, file)).data)
      } catch (err) {
        onError(apiError(err, `Could not attach ${file.name}.`))
      }
    }
    setSaving(false)
    onCreated({ ...created, screenshots: shots })
  }

  return (
    <div className="rounded-xl p-4 space-y-3" onPaste={onPaste} onDragOver={e => e.preventDefault()} onDrop={onDrop}
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}>
      <p className="text-sm font-semibold text-primary-ui">Report a correction</p>
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="corr-page" className="label-field">Page</label>
          <select id="corr-page" className="input-field" value={form.pageId} onChange={e => setForm({ ...form, pageId: e.target.value })}>
            <option value="">Whole site / not page specific</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.path}{p.title ? ` · ${p.title}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="corr-title" className="label-field">What should change?</label>
          <input id="corr-title" className="input-field" autoFocus maxLength={200} placeholder="e.g. Logo is too small on mobile"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor="corr-body" className="label-field">Details</label>
        <textarea id="corr-body" className="input-field text-sm" rows={3} placeholder="Where exactly, and how it should look or behave instead…"
          value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label htmlFor="corr-priority" className="label-field">Priority</label>
          <select id="corr-priority" className="input-field py-2 text-xs" value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value as CorrectionPriority })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label htmlFor="corr-viewport" className="label-field">Seen on</label>
          <select id="corr-viewport" className="input-field py-2 text-xs" value={form.viewport}
            onChange={e => setForm({ ...form, viewport: e.target.value as CorrectionViewport | '' })}>
            <option value="">Any screen</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="both">Desktop and mobile</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <span className="label-field">Screenshots</span>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_SHOTS}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            <ImageIcon size={13} /> Paste, drop or choose images ({files.length}/{MAX_SHOTS})
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        </div>
      </div>
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
              <ImageIcon size={11} /> <span className="max-w-[140px] truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={saving}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded text-sm disabled:opacity-50">
          <Send size={13} /> {saving ? 'Sending…' : 'Send correction'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost px-4 py-2 rounded text-sm">Cancel</button>
      </div>
    </div>
  )
}

function CorrectionCard({ c, expanded, highlight, onToggle, onChange, onDeleted, onError }: {
  c: Correction
  expanded: boolean
  highlight: boolean
  onToggle: () => void
  onChange: (c: Correction) => void
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const talk = c.comments.filter(m => m.kind !== 'status').length
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${highlight ? 'rgb(var(--fg-rgb) / 0.35)' : 'var(--border)'}` }}>
      <button type="button" onClick={onToggle} aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left flex-wrap sm:flex-nowrap hover:bg-[var(--row-hover-bg)] transition-colors"
        style={{ background: highlight ? 'rgb(var(--fg-rgb) / 0.04)' : 'transparent' }}>
        <ChevronDown size={13} className="shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'none' : 'rotate(-90deg)' }} />
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>C-{c.number}</span>
        <span className="text-sm font-medium truncate flex-1 min-w-0 text-primary-ui">{c.title}</span>
        <span className="hidden sm:block text-xs font-mono truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>
          {c.page?.path ?? (c.pageUrl ? new URL(c.pageUrl).pathname : 'Whole site')}
        </span>
        {c.priority === 'high' && <span className="text-[10px] font-bold shrink-0" style={{ color: 'var(--fg)' }}>HIGH</span>}
        {c.reopenCount > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] shrink-0" title={`Sent back ${c.reopenCount} time${c.reopenCount === 1 ? '' : 's'}`}
            style={{ color: 'var(--fg)' }}><RotateCcw size={11} />{c.reopenCount}</span>
        )}
        {c.screenshots.length > 0 && <span className="flex items-center gap-0.5 text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}><ImageIcon size={11} />{c.screenshots.length}</span>}
        {talk > 0 && <span className="flex items-center gap-0.5 text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}><MessageSquare size={11} />{talk}</span>}
        <StatusBadge status={c.status} />
      </button>
      {expanded && <CorrectionDetail c={c} onChange={onChange} onDeleted={onDeleted} onError={onError} />}
    </div>
  )
}

function CorrectionDetail({ c, onChange, onDeleted, onError }: {
  c: Correction
  onChange: (c: Correction) => void
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const user = useAuthStore(s => s.user)
  const role = user?.role
  const isClient = role === 'client'
  const [text, setText] = useState('')
  const [teamOnly, setTeamOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const run = async (fn: () => Promise<{ data: Correction }>, fallback: string) => {
    setBusy(true)
    onError('')
    try {
      onChange((await fn()).data)
      return true
    } catch (err) {
      onError(apiError(err, fallback))
      return false
    } finally {
      setBusy(false)
    }
  }

  const post = async (kind: 'comment' | 'question') => {
    if (!text.trim()) return
    const ok = await run(() => correctionsApi.comment(c.id, {
      body: text.trim(), kind, ...(!isClient && { visibility: teamOnly && kind === 'comment' ? 'internal' : 'client' }),
    }), 'Could not send the comment.')
    if (ok) setText('')
  }

  // The client's verdict on a fix; a note typed alongside "Still not right" goes into the thread first
  const verdict = async (status: 'confirmed' | 'reopened') => {
    if (status === 'reopened' && text.trim()) {
      if (!(await run(() => correctionsApi.comment(c.id, { body: text.trim() }), 'Could not send the comment.'))) return
      setText('')
    }
    await run(() => correctionsApi.update(c.id, { status }), 'Could not update the correction.')
  }

  const remove = async () => {
    try {
      await correctionsApi.delete(c.id)
      onDeleted()
    } catch (err) {
      onError(apiError(err, 'Could not delete the correction.'))
    }
  }

  const allowed = STATUSES.filter(s => role === 'admin' || (s !== 'confirmed' && s !== 'wontfix') || s === c.status)
  const pageHref = c.page?.url ?? c.pageUrl

  return (
    <div className="px-4 pb-4 pt-2 space-y-4" style={{ background: 'var(--bg-elevated)' }}>
      <div className="space-y-1.5">
        <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
        <p className="flex items-center gap-2 flex-wrap text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>{c.createdBy?.name ?? 'Former user'} · {fmtWhen(c.createdAt)}</span>
          {c.viewport && (
            <span className="flex items-center gap-1">
              {c.viewport === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
              {c.viewport === 'both' ? 'Desktop and mobile' : c.viewport === 'mobile' ? 'Mobile' : 'Desktop'}
            </span>
          )}
          {pageHref && <a href={pageHref} target="_blank" rel="noopener noreferrer" className="underline">{c.page?.path ?? pageHref}</a>}
        </p>
      </div>

      {c.screenshots.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {c.screenshots.map(s => <Screenshot key={s.id} id={s.id} name={s.name} />)}
        </div>
      )}

      {c.comments.length > 0 && (
        <div className="space-y-2">
          {c.comments.map(m => m.kind === 'status' ? (
            <p key={m.id} className="text-[11px] pl-6" style={{ color: 'var(--text-muted)' }}>
              {m.author?.name ?? 'Someone'} moved it {m.body} · {fmtWhen(m.createdAt)}
            </p>
          ) : (
            <div key={m.id} className="flex items-start gap-2 rounded-lg px-3 py-2"
              style={{ background: m.kind === 'question' ? 'rgb(var(--fg-rgb) / 0.06)' : 'var(--input-bg)', border: m.kind === 'question' ? '1px solid rgb(var(--fg-rgb) / 0.25)' : '1px solid transparent' }}>
              <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                {m.kind === 'question' ? <HelpCircle size={12} style={{ color: 'var(--fg)' }} /> : m.visibility === 'internal' ? <Lock size={12} /> : <MessageSquare size={12} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>{m.body}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {m.author?.name ?? 'Former user'}{m.author?.role === 'client' && ' (client)'}
                  {m.kind === 'question' && ' · question'}{m.kind === 'answer' && ' · answer'}
                  {m.visibility === 'internal' && ' · team only'} · {fmtWhen(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isClient && c.status === 'needs_info' && (
        <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>The team needs a bit more information. Reply below.</p>
      )}
      {isClient && c.status === 'fixed' && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2.5" style={{ border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}>
          <span className="text-xs flex-1 min-w-[160px]" style={{ color: 'var(--text-secondary)' }}>The team marked this fixed. Please check it on the site.</span>
          <button type="button" disabled={busy} onClick={() => verdict('confirmed')}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50"><CheckCircle2 size={12} /> Looks good</button>
          <button type="button" disabled={busy} onClick={() => verdict('reopened')}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50"><RotateCcw size={12} /> Still not right</button>
        </div>
      )}

      <div className="space-y-2">
        <textarea className="input-field text-sm" rows={2} aria-label={`Comment on C-${c.number}`} value={text} disabled={busy}
          placeholder={isClient ? (c.status === 'needs_info' ? 'Your answer…' : c.status === 'fixed' ? 'What is still not right? (optional)' : 'Add a comment…') : 'Comment, or ask the client a question…'}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post('comment') }} />
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => post('comment')} disabled={busy || !text.trim()}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-40">
            <Send size={12} /> {isClient && c.status === 'needs_info' ? 'Send answer' : 'Comment'}
          </button>
          {!isClient && (
            <>
              <button type="button" onClick={() => post('question')} disabled={busy || !text.trim()}
                title="Asks the client and marks the correction Needs info"
                className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-40">
                <HelpCircle size={12} /> Ask client
              </button>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={teamOnly} onChange={e => setTeamOnly(e.target.checked)} /> Team only
              </label>
              <select className="input-field py-1 text-xs w-auto ml-auto" aria-label={`Status of C-${c.number}`} value={c.status} disabled={busy}
                onChange={e => run(() => correctionsApi.update(c.id, { status: e.target.value as CorrectionStatus }), 'Could not change the status.')}>
                {allowed.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              {role === 'admin' && (confirmDelete ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={remove} className="font-bold" style={{ color: 'var(--fg)' }}>Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Delete C-${c.number}`} title="Delete correction"
                  className="p-1.5 rounded hover:bg-[var(--row-hover-bg)]" style={{ color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Screenshots download with the auth header, so they are fetched and shown from a local object URL
function Screenshot({ id, name }: { id: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let url: string | null = null
    let alive = true
    documentsApi.blob(id).then(b => {
      url = URL.createObjectURL(b)
      if (alive) setSrc(url)
    }).catch(() => {})
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [id])
  return (
    <a href={src ?? undefined} target="_blank" rel="noopener noreferrer" title={name}
      className="block w-28 h-20 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border)', background: 'var(--input-bg)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated fetch */}
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full"><ImageIcon size={14} style={{ color: 'var(--text-muted)' }} /></span>}
    </a>
  )
}
