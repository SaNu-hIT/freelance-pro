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
  getAll: (params?: Record<string, unknown>) => api.get('/projects', { params }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
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

export default api
