'use client'

import { useEffect, useState } from 'react'
import {
  Link2, Radar, Plus, Search, ChevronDown, ExternalLink, Archive, ArchiveRestore, Trash2, MessageSquare, Lock, Eye,
} from 'lucide-react'
import { pagesApi } from '@/lib/api'
import { NoteVisibility, PageNote, ProjectPage } from '@/lib/types'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const SOURCE_LABEL: Record<ProjectPage['source'], string> = { sitemap: 'Sitemap', crawl: 'Found', manual: 'Added' }

const fmtWhen = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Every page of the project's website, each with its own notes
export function ProjectLinks({ projectId, liveUrl }: { projectId: string; liveUrl: string | null }) {
  const [pages, setPages] = useState<ProjectPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    pagesApi.list(projectId)
      .then(res => setPages(res.data))
      .catch(err => setError(apiError(err, 'Could not load the website links.')))
      .finally(() => setLoading(false))
  }, [projectId])

  const reload = async () => setPages((await pagesApi.list(projectId)).data)

  const discover = async () => {
    setDiscovering(true)
    setError('')
    setInfo('')
    try {
      const res = await pagesApi.discover(projectId)
      await reload()
      const { found, added } = res.data as { found: number; added: number }
      setInfo(found === 0 ? 'No pages found on the live site.' : `Found ${found} page${found === 1 ? '' : 's'}, ${added} new.`)
    } catch (err) {
      setError(apiError(err, 'Could not read the live site.'))
    } finally {
      setDiscovering(false)
    }
  }

  const add = async () => {
    if (!newUrl.trim() || adding) return
    setAdding(true)
    setError('')
    try {
      const res = await pagesApi.create({ projectId, url: newUrl.trim() })
      setPages(prev => [...prev, res.data].sort((a, b) => a.path.localeCompare(b.path)))
      setNewUrl('')
    } catch (err) {
      setError(apiError(err, 'Could not add the link.'))
    } finally {
      setAdding(false)
    }
  }

  const patchPage = (id: string, patch: Partial<ProjectPage>) =>
    setPages(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))

  const setArchived = async (page: ProjectPage, archived: boolean) => {
    setError('')
    try {
      await pagesApi.update(page.id, { archived })
      patchPage(page.id, { archived })
    } catch (err) {
      setError(apiError(err, 'Could not update the link.'))
    }
  }

  const remove = async (page: ProjectPage) => {
    setError('')
    try {
      await pagesApi.delete(page.id)
      setPages(prev => prev.filter(p => p.id !== page.id))
    } catch (err) {
      setError(apiError(err, 'Could not delete the link.'))
    }
  }

  const q = query.trim().toLowerCase()
  const archivedCount = pages.filter(p => p.archived).length
  const visible = pages.filter(p =>
    (showArchived || !p.archived) &&
    (!q || p.path.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q)))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link2 size={15} style={{ color: 'var(--fg)' }} />
        <h2 className="text-sm font-bold text-primary-ui">Website links</h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pages.length - archivedCount} page{pages.length - archivedCount === 1 ? '' : 's'}
        </span>
        <button type="button" onClick={discover} disabled={!liveUrl || discovering}
          title={liveUrl ? `Read the sitemap and links of ${liveUrl}` : 'Add the live URL to the project first'}
          className="btn-primary ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50">
          <Radar size={13} /> {discovering ? 'Reading site…' : 'Discover links'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {info && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{info}</p>}

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <input className="input-field flex-1 min-w-[180px] py-2 text-sm" aria-label="Add a link" value={newUrl} disabled={adding}
          placeholder={liveUrl ? 'Add a page: /about or a full URL' : 'Add a page: full URL'}
          onChange={e => setNewUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button type="button" onClick={add} disabled={!newUrl.trim() || adding}
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 rounded text-xs disabled:opacity-40">
          <Plus size={13} /> Add
        </button>
      </div>

      {pages.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="input-field w-full py-1.5 pl-8 text-xs" placeholder="Filter by path or title" aria-label="Filter links"
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          {archivedCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
              Show archived ({archivedCount})
            </label>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : pages.length === 0 ? (
        <p className="text-sm rounded-xl px-4 py-3" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
          {liveUrl
            ? <>Use <strong>Discover links</strong> to list every page of the live site, or add pages one by one.</>
            : 'Add the live URL to the project to discover its pages, or add full page URLs above.'}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No links match.</p>
      ) : (
        <div className="rounded-xl overflow-hidden divide-y" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          {visible.map(page => (
            <PageRow key={page.id} page={page} expanded={open === page.id}
              onToggle={() => setOpen(o => (o === page.id ? null : page.id))}
              onArchive={() => setArchived(page, !page.archived)} onDelete={() => remove(page)}
              onNotes={notes => patchPage(page.id, { notes })} onError={setError} />
          ))}
        </div>
      )}
    </div>
  )
}

function PageRow({ page, expanded, onToggle, onArchive, onDelete, onNotes, onError }: {
  page: ProjectPage
  expanded: boolean
  onToggle: () => void
  onArchive: () => void
  onDelete: () => void
  onNotes: (notes: PageNote[]) => void
  onError: (msg: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const count = page.notes.length

  return (
    <div style={{ borderColor: 'var(--border)', opacity: page.archived ? 0.55 : 1 }}>
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--row-hover-bg)] transition-colors">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronDown size={13} className="shrink-0 transition-transform"
            style={{ color: 'var(--text-muted)', transform: expanded ? 'none' : 'rotate(-90deg)' }} />
          <span className="text-sm font-mono truncate text-primary-ui">{page.path}</span>
          {page.title && <span className="hidden md:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{page.title}</span>}
        </button>
        {page.archived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Archived</span>}
        <span className="hidden sm:block text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{SOURCE_LABEL[page.source]}</span>
        <button type="button" onClick={onToggle} className="flex items-center gap-1 text-xs shrink-0 tabular-nums"
          style={{ color: count ? 'var(--fg)' : 'var(--text-muted)' }} aria-label={`${count} notes`}>
          <MessageSquare size={12} /> {count}
        </button>
        <a href={page.url} target="_blank" rel="noopener noreferrer" title="Open page" aria-label={`Open ${page.path}`}
          className="p-1.5 rounded shrink-0" style={{ color: 'var(--text-muted)' }}><ExternalLink size={12} /></a>
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-xs shrink-0">
            <button type="button" onClick={onDelete} className="font-bold" style={{ color: 'var(--fg)' }}>Delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
          </span>
        ) : (
          <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <IconButton label={page.archived ? `Restore ${page.path}` : `Archive ${page.path}`} onClick={onArchive}>
              {page.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
            </IconButton>
            <IconButton label={`Delete ${page.path}`} onClick={() => setConfirmDelete(true)}><Trash2 size={12} /></IconButton>
          </span>
        )}
      </div>
      {expanded && <Notes page={page} onNotes={onNotes} onError={onError} />}
    </div>
  )
}

function Notes({ page, onNotes, onError }: { page: ProjectPage; onNotes: (n: PageNote[]) => void; onError: (msg: string) => void }) {
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('internal')
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!body.trim() || saving) return
    setSaving(true)
    onError('')
    try {
      const res = await pagesApi.addNote(page.id, { body: body.trim(), visibility })
      onNotes([...page.notes, res.data])
      setBody('')
    } catch (err) {
      onError(apiError(err, 'Could not add the note.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (note: PageNote) => {
    onError('')
    try {
      await pagesApi.deleteNote(note.id)
      onNotes(page.notes.filter(n => n.id !== note.id))
    } catch (err) {
      onError(apiError(err, 'Could not delete the note.'))
    }
  }

  return (
    <div className="px-4 pb-3 pt-1 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
      {page.notes.length === 0 && <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>No notes on this page yet.</p>}
      {page.notes.map(note => (
        <div key={note.id} className="group flex items-start gap-2 pt-2">
          <span className="mt-0.5 shrink-0" title={note.visibility === 'client' ? 'Visible to the client' : 'Team only'}
            style={{ color: note.visibility === 'client' ? 'var(--fg)' : 'var(--text-muted)' }}>
            {note.visibility === 'client' ? <Eye size={12} /> : <Lock size={12} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>{note.body}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {note.author?.name ?? 'Former user'}{note.author?.role === 'client' && ' (client)'} · {fmtWhen(note.createdAt)}
            </p>
          </div>
          <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <IconButton label="Delete note" onClick={() => remove(note)}><Trash2 size={12} /></IconButton>
          </span>
        </div>
      ))}
      <div className="flex items-start gap-2 pt-2 flex-wrap sm:flex-nowrap">
        <textarea className="input-field flex-1 min-w-[180px] py-2 text-sm" rows={2} aria-label={`Note for ${page.path}`}
          placeholder="Add a note…" value={body} disabled={saving} onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }} />
        <div className="flex flex-col gap-1.5">
          <select className="input-field py-1.5 text-xs" aria-label="Who can see this note" value={visibility}
            onChange={e => setVisibility(e.target.value as NoteVisibility)}>
            <option value="internal">Team only</option>
            <option value="client">Client can see</option>
          </select>
          <button type="button" onClick={add} disabled={!body.trim() || saving}
            className="btn-primary px-3 py-1.5 rounded text-xs disabled:opacity-40">{saving ? 'Saving…' : 'Add note'}</button>
        </div>
      </div>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="p-1.5 rounded transition-colors hover:bg-[var(--row-hover-bg)]" style={{ color: 'var(--text-muted)' }}>
      {children}
    </button>
  )
}
