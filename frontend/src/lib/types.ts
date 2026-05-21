export type UserRole = 'admin' | 'freelancer' | 'client'
export type ProjectStatus = 'new' | 'assigned' | 'in_progress' | 'blocked' | 'pending_approval' | 'completed' | 'delayed'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
export type PaymentStatus = 'pending' | 'paid' | 'partial'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  profileImage?: string
  createdAt: string
}

export type OnboardingStage = 'applied' | 'reviewing' | 'assessment' | 'approved' | 'rejected'

export interface FreelancerProfile {
  id: string
  userId: string
  user: User
  skills: string[]
  experience: number
  hourlyRate: number
  status: 'active' | 'inactive' | 'pending'
  onboardingStage?: OnboardingStage
  bio?: string
  portfolioUrl?: string
  track?: 'professional' | 'intern'
  rejectionReason?: string
  adminNotes?: string
  verifications?: Record<string, boolean>
  createdAt?: string
}

export interface Project {
  id: string
  title: string
  description: string
  budget: number
  deadline: string
  status: ProjectStatus
  priority: ProjectPriority
  clientId?: string
  client?: User
  assignedTo?: string
  assignedFreelancer?: FreelancerProfile
  teamMembers?: FreelancerProfile[]
  progress: number
  repoUrl?: string
  liveUrl?: string
  correctionSheetUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Worklog {
  id: string
  projectId: string
  project?: Project
  freelancerId: string
  freelancer?: FreelancerProfile
  date: string
  hoursWorked: number
  tasksCompleted: string
  progress: number
  blockers?: string
  nextSteps?: string
  fileUrls?: string[]
  createdAt: string
}

export interface Payment {
  id: string
  projectId: string
  project?: Project
  freelancerId: string
  freelancer?: FreelancerProfile
  amount: number
  deductions: number
  netAmount: number
  status: PaymentStatus
  notes?: string
  createdAt: string
}

export interface ProjectSprint {
  id: string
  projectId: string
  name: string
  order: number
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export interface ProjectTask {
  id: string
  projectId: string
  sprintId: string | null
  sprint?: ProjectSprint | null
  assignedFreelancerId: string | null
  assignedFreelancer?: FreelancerProfile | null
  title: string
  completed: boolean
  order: number
  completedAt: string | null
  createdAt: string
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  delayedProjects: number
  completedProjects: number
  pendingApprovals: number
  totalFreelancers: number
  activeFreelancers: number
  totalEarnings?: number
  pendingPayments?: number
}
