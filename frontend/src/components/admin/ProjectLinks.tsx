'use client'

import { useEffect, useState } from 'react'
import {
  Link2, Radar, Plus, Search, ExternalLink, Archive, ArchiveRestore, Trash2, ClipboardList,
} from 'lucide-react'
import { pagesApi } from '@/lib/api'
import { ProjectPage } from '@/lib/types'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const SOURCE_LABEL: Record<ProjectPage['source'], string> = { sitemap: 'Sitemap', crawl: 'Found', manual: 'Added' }

// A web address (full, or a host like site.com/about) rather than a page path like /about
const isAddress = (s: string) => /^[a-z][a-z\d+.-]*:\/\//i.test(s.trim()) || /^[^/]+\.[^/]+/.test(s.trim())

// Corrections on one page: all of them, and those still with the team
export type PageCorrectionCount = { total: number; active: number }

// Every page of the project's website; corrections are reported and listed per page
export function ProjectLinks({ projectId, liveUrl, corrections, onShowCorrections, onReport }: {
  projectId: string
  liveUrl: string | null
  corrections: Record<string, PageCorrectionCount>
  onShowCorrections: (pageId: string) => void
  onReport: (pageId: string) => void
}) {
  // The site Discover reads; a project without a live URL takes the first site discovered
  const [site, setSite] = useState(liveUrl)
  const [pages, setPages] = useState<ProjectPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    pagesApi.list(projectId)
      .then(res => setPages(res.data))
      .catch(err => setError(apiError(err, 'Could not load the website links.')))
      .finally(() => setLoading(false))
  }, [projectId])

  const reload = async () => setPages((await pagesApi.list(projectId)).data)

  // A website address typed in the box is read instead of the live URL
  const typedSite = isAddress(newUrl) ? newUrl.trim() : ''
  const discoverFrom = typedSite || site

  const discover = async () => {
    if (!discoverFrom) return
    setDiscovering(true)
    setError('')
    setInfo('')
    try {
      const res = await pagesApi.discover(projectId, typedSite || undefined)
      await reload()
      const { found, added, site: read } = res.data as { found: number; added: number; site: string }
      setSite(read)
      if (typedSite) setNewUrl('')
      setInfo(found === 0
        ? 'No pages found. The site may build its menu with JavaScript; add pages one by one below.'
        : `Found ${found} page${found === 1 ? '' : 's'}, ${added} new.`)
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
        <button type="button" onClick={discover} disabled={!discoverFrom || discovering}
          title={discoverFrom ? `Find every page of ${discoverFrom}` : 'Type the website address first'}
          className="btn-primary ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50">
          <Radar size={13} /> {discovering ? 'Reading site…' : 'Discover links'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {info && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{info}</p>}

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <input className="input-field flex-1 min-w-[180px] py-2 text-sm" aria-label="Add a link" value={newUrl} disabled={adding}
          placeholder={site ? 'Add a page like /about, or another site to discover' : 'Website address, e.g. example.com'}
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
          {site
            ? <>Use <strong>Discover links</strong> to list every page of {site}. The client can then report corrections page by page.</>
            : <>Type the website address above and click <strong>Discover links</strong> to list all its pages. The client can then report corrections page by page.</>}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No links match.</p>
      ) : (
        <div className="rounded-xl overflow-hidden divide-y" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          {visible.map(page => (
            <PageRow key={page.id} page={page} count={corrections[page.id]}
              onShow={() => onShowCorrections(page.id)} onReport={() => onReport(page.id)}
              onArchive={() => setArchived(page, !page.archived)} onDelete={() => remove(page)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PageRow({ page, count, onShow, onReport, onArchive, onDelete }: {
  page: ProjectPage
  count?: PageCorrectionCount
  onShow: () => void
  onReport: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const name = page.path === '/' ? 'Home' : page.path

  return (
    <div style={{ borderColor: 'var(--border)', opacity: page.archived ? 0.55 : 1 }}>
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--row-hover-bg)] transition-colors">
        <a href={page.url} target="_blank" rel="noopener noreferrer" title={`Open ${page.url}`}
          className="flex items-center gap-2 min-w-0 flex-1 hover:underline">
          <span className="text-sm font-mono truncate text-primary-ui">{name}</span>
          {page.title && <span className="hidden md:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{page.title}</span>}
          <ExternalLink size={11} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        </a>
        {page.archived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Archived</span>}
        <span className="hidden sm:block text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{SOURCE_LABEL[page.source]}</span>
        {count && (
          <button type="button" onClick={onShow} className="flex items-center gap-1 text-xs shrink-0 tabular-nums"
            title={`${count.total} correction${count.total === 1 ? '' : 's'}, ${count.active} with the team. Show them.`}
            style={{ color: count.active ? 'var(--fg)' : 'var(--text-muted)' }}>
            <ClipboardList size={12} /> {count.total}
          </button>
        )}
        {!page.archived && (
          <button type="button" onClick={onReport} title={`Report a correction on ${name}`}
            className="btn-ghost flex items-center gap-1 px-2 py-1 rounded text-[11px] shrink-0">
            <Plus size={11} /> Correction
          </button>
        )}
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
