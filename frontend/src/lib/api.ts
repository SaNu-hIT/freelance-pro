import axios from 'axios'
import type { CorrectionPriority, CorrectionStatus, CorrectionViewport } from './types'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-store')
      const token = raw ? JSON.parse(raw)?.state?.token : null
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {}
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data),
  // Emails a one-time link; answers the same whether or not the email has an account
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
}

export const projectsApi = {
  // The API pages 20 by default; screens here want every project they can see
  getAll: (params?: Record<string, unknown>) => api.get('/projects', { params: { limit: 1000, ...params } }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  approve: (id: string) => api.post(`/projects/${id}/approve`),
  requestChanges: (id: string, message: string) => api.post(`/projects/${id}/request-changes`, { message }),
}

export const worklogsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/worklogs', { params }),
  create: (data: Record<string, unknown>) => api.post('/worklogs', data),
  // Hours in total, since weekStart (YYYY-MM-DD) and per project; scoped to the freelancer for freelancers
  summary: (weekStart: string) => api.get('/worklogs/summary', { params: { weekStart } }),
}

export const freelancersApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/freelancers', { params }),
  getOne: (id: string) => api.get(`/freelancers/${id}`),
  approve: (id: string) => api.patch(`/freelancers/${id}/approve`),
  reject: (id: string, reason: string) => api.patch(`/freelancers/${id}/reject`, { reason }),
  updateStage: (id: string, stage: string) => api.patch(`/freelancers/${id}/stage`, { stage }),
  updateVerifications: (id: string, verifications: Record<string, boolean>) =>
    api.patch(`/freelancers/${id}/verifications`, { verifications }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/freelancers/${id}`, data),
  getAvailability: (id: string) => api.get(`/freelancers/${id}/availability`),
  updateAvailability: (id: string, availability: Record<string, unknown>) =>
    api.patch(`/freelancers/${id}/availability`, availability),
}

export const paymentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/payments', { params }),
  create: (data: Record<string, unknown>) => api.post('/payments', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/payments/${id}`, data),
}

export const sprintsApi = {
  getByProject: (projectId: string) => api.get('/sprints', { params: { projectId } }),
  create: (data: { projectId: string; name: string; order?: number; startDate?: string; endDate?: string }) => api.post('/sprints', data),
  update: (id: string, data: { name?: string; order?: number; startDate?: string; endDate?: string }) => api.patch(`/sprints/${id}`, data),
  delete: (id: string) => api.delete(`/sprints/${id}`),
  approve: (id: string) => api.patch(`/sprints/${id}/approve`),
}

export const tasksApi = {
  getByProject: (projectId: string) => api.get('/tasks', { params: { projectId } }),
  create: (data: { projectId: string; title: string; order?: number; sprintId?: string; assignedFreelancerId?: string }) => api.post('/tasks', data),
  update: (id: string, data: { title?: string; completed?: boolean; inProgress?: boolean; order?: number; sprintId?: string | null; assignedFreelancerId?: string | null }) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  // Worklog timer: mark a task in progress, stop it, and list what is running now
  start: (id: string, startedAt?: string) => api.post(`/tasks/${id}/start`, startedAt ? { startedAt } : {}),
  stop: () => api.post('/tasks/stop'),
  running: () => api.get('/tasks/running'),
  inProgress: () => api.get('/tasks/in-progress'),
}

export const dashboardApi = {
  getStats: () => api.get('/projects/dashboard/stats'),
}

export const settingsApi = {
  get: () => api.get('/platform-settings'),
  update: (data: Partial<{ currency: string; timezone: string; maintenanceMode: boolean; newRegistrations: boolean; requireApproval: boolean }>) =>
    api.patch('/platform-settings', data),
}

export const chatApi = {
  getMessages: (projectId?: string) => api.get('/chat/messages', { params: projectId ? { projectId } : {} }),
  send: (data: { projectId: string; projectTitle: string; from: 'client' | 'admin'; sender: string; senderId: string; text: string; readByAdmin?: boolean; readByClient?: boolean }) =>
    api.post('/chat/messages', data),
  markRead: (projectId: string, by: 'admin' | 'client') =>
    api.patch('/chat/messages/mark-read', { projectId, by }),
  unread: (by: 'admin' | 'client', projectId?: string) =>
    api.get('/chat/unread', { params: { by, ...(projectId ? { projectId } : {}) } }),
}

export const skillGroupsApi = {
  getAll:      ()                                    => api.get('/skill-groups'),
  create:      (data: { name: string; color?: string; skills?: string[] }) => api.post('/skill-groups', data),
  update:      (id: string, data: { name?: string; color?: string; skills?: string[]; order?: number }) => api.patch(`/skill-groups/${id}`, data),
  delete:      (id: string)                          => api.delete(`/skill-groups/${id}`),
  addSkill:    (id: string, skill: string)           => api.post(`/skill-groups/${id}/skills`, { skill }),
  removeSkill: (id: string, skill: string)           => api.delete(`/skill-groups/${id}/skills/${encodeURIComponent(skill)}`),
}

export const usersApi = {
  list: (role?: 'admin' | 'freelancer' | 'client') => api.get('/users', { params: role ? { role } : {} }),
  createClient: (data: { name: string; email: string; password: string; company?: string; phone?: string }) =>
    api.post('/users/clients', data),
  createFreelancer: (data: {
    name: string; email: string; password: string; phone?: string; skills?: string[]; experience?: number
    hourlyRate?: number; bio?: string; portfolioUrl?: string; track?: 'professional' | 'intern'
  }) => api.post('/users/freelancers', data),
  update: (id: string, data: { name?: string; email?: string; phone?: string; company?: string }) =>
    api.patch(`/users/${id}`, data),
  // Without newPassword the server generates one; the response's temporaryPassword is shown to the admin once
  resetPassword: (id: string, newPassword?: string) => api.patch(`/users/${id}/password`, newPassword ? { newPassword } : {}),
  remove: (id: string) => api.delete(`/users/${id}`),
  me:() => api.get('/users/me'),
  updateMe: (data: { name?: string; email?: string; phone?: string; company?: string; notificationPrefs?: Record<string, boolean> }) =>
    api.patch('/users/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),
  deleteMe: (password: string) => api.delete('/users/me', { data: { password } }),
}

export const projectRequestsApi = {
  list: (params?: { projectId?: string; kind?: 'question' | 'change' | 'escalation'; status?: 'open' | 'resolved' }) =>
    api.get('/project-requests', { params }),
  create: (data: { projectId: string; kind: 'question' | 'change' | 'escalation'; subject: string; body: string; urgency?: 'normal' | 'high' | 'critical' }) =>
    api.post('/project-requests', data),
  resolve: (id: string, reply?: string) => api.patch(`/project-requests/${id}/resolve`, { reply }),
}

export const documentsApi = {
  list: (projectId?: string) => api.get('/documents', { params: projectId ? { projectId } : {} }),
  upload: (projectId: string, file: File, meta?: { type?: string; status?: string; description?: string }) => {
    const form = new FormData()
    form.append('projectId', projectId)
    Object.entries(meta ?? {}).forEach(([k, v]) => v && form.append(k, v))
    form.append('file', file)
    // Let the browser set the multipart boundary
    return api.post('/documents', form, { headers: { 'Content-Type': undefined } })
  },
  // Fetch with the auth header, then hand the bytes to the browser as a download
  download: async (id: string, name: string) => {
    const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  },
  // The file's bytes, for showing an image inline
  blob: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }).then(r => r.data as Blob),
  update: (id: string, data: { type?: string; status?: string; description?: string }) => api.patch(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
}

export const pagesApi = {
  list: (projectId: string) => api.get('/pages', { params: { projectId } }),
  // url is a full address or a path like /about, resolved against the project's live URL
  create: (data: { projectId: string; url: string; title?: string }) => api.post('/pages', data),
  update: (id: string, data: { title?: string; archived?: boolean }) => api.patch(`/pages/${id}`, data),
  delete: (id: string) => api.delete(`/pages/${id}`),
  // Reads a site's sitemap and links (url, else the project's live URL); can take up to ~40s
  discover: (projectId: string, url?: string) => api.post('/pages/discover', { projectId, ...(url && { url }) }, { timeout: 60000 }),
}

export const correctionsApi = {
  list: (projectId: string) => api.get('/corrections', { params: { projectId } }),
  // Admin: counts per project
  summary: () => api.get('/corrections/summary'),
  create: (data: { projectId: string; pageId?: string; title: string; body: string; priority?: CorrectionPriority; viewport?: CorrectionViewport }) =>
    api.post('/corrections', data),
  update: (id: string, data: { pageId?: string | null; title?: string; body?: string; priority?: CorrectionPriority; viewport?: CorrectionViewport | null; status?: CorrectionStatus }) =>
    api.patch(`/corrections/${id}`, data),
  delete: (id: string) => api.delete(`/corrections/${id}`),
  // kind 'question' asks the client and waits on their answer
  comment: (id: string, data: { body: string; kind?: 'comment' | 'question'; visibility?: 'internal' | 'client' }) =>
    api.post(`/corrections/${id}/comments`, data),
  deleteComment: (commentId: string) => api.delete(`/corrections/comments/${commentId}`),
  addScreenshot: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/corrections/${id}/screenshots`, form, { headers: { 'Content-Type': undefined } })
  },
  // Admin: put the correction on the task board; its task's progress then moves the correction's status
  createTask: (id: string, data: { title?: string; sprintId?: string; assignedFreelancerId?: string }) =>
    api.post(`/corrections/${id}/task`, data),
}

export default api
