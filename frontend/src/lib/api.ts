import axios from 'axios'

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
  update: (id: string, data: { title?: string; completed?: boolean; order?: number; sprintId?: string | null; assignedFreelancerId?: string | null }) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
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
  resetPassword: (id: string, newPassword: string) => api.patch(`/users/${id}/password`, { newPassword }),
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
  update: (id: string, data: { type?: string; status?: string; description?: string }) => api.patch(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
}

export default api
