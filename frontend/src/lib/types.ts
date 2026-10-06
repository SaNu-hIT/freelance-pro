export type UserRole = 'admin' | 'freelancer' | 'client'
export type ProjectStatus = 'new' | 'reviewed' | 'onboarded' | 'assigned' | 'in_progress' | 'blocked' | 'pending_approval' | 'completed' | 'delayed'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
export type PaymentStatus = 'pending' | 'paid' | 'partial'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  profileImage?: string
  phone?: string | null
  company?: string | null
  notificationPrefs?: Record<string, boolean> | null
  // An admin reset the password; the user must choose their own before using the app
  mustChangePassword?: boolean
  projectCount?: number
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
  startedAt?: string | null
  endedAt?: string | null
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
  approvedAt?: string | null
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
  // Set when marked in progress; stays until done or moved back to to-do
  inProgressAt?: string | null
  // Set while a freelancer's worklog timer runs on this task
  startedAt?: string | null
  startedById?: string | null
  startedBy?: FreelancerProfile | null
  project?: Project
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
  newProjectsLast30Days?: number
  newFreelancersLast30Days?: number
}

export type ProjectRequestKind = 'question' | 'change' | 'escalation'

export interface ProjectRequest {
  id: string
  projectId: string
  project?: Pick<Project, 'id' | 'title'>
  kind: ProjectRequestKind
  fromUserId: string
  fromUser?: Pick<User, 'id' | 'name' | 'role'>
  subject: string
  body: string
  urgency: 'normal' | 'high' | 'critical'
  status: 'open' | 'resolved'
  reply: string | null
  resolvedById: string | null
  resolvedAt: string | null
  createdAt: string
}

export type DocumentType = 'deliverable' | 'contract' | 'report' | 'invoice' | 'attachment'

export interface ProjectDocument {
  id: string
  projectId: string
  project?: Pick<Project, 'id' | 'title'>
  uploadedById: string
  uploadedBy?: Pick<User, 'id' | 'name' | 'role'>
  name: string
  mimeType: string
  size: number
  type: DocumentType
  status: 'delivered' | 'in-review'
  description: string | null
  createdAt: string
}

export type PageSource = 'sitemap' | 'crawl' | 'manual'
export type NoteVisibility = 'internal' | 'client'

export interface PageNote {
  id: string
  pageId: string
  authorId: string | null
  author?: Pick<User, 'id' | 'name' | 'role'> | null
  body: string
  visibility: NoteVisibility
  createdAt: string
}

export interface ProjectPage {
  id: string
  projectId: string
  url: string
  path: string
  title: string | null
  source: PageSource
  archived: boolean
  lastSeenAt: string | null
  notes: PageNote[]
  createdAt: string
}

export type CorrectionStatus = 'open' | 'triaged' | 'needs_info' | 'in_progress' | 'fixed' | 'confirmed' | 'reopened' | 'wontfix'
export type CorrectionPriority = 'low' | 'normal' | 'high'
export type CorrectionViewport = 'desktop' | 'mobile' | 'both'

export interface CorrectionComment {
  id: string
  correctionId: string
  authorId: string | null
  author?: Pick<User, 'id' | 'name' | 'role'> | null
  kind: 'comment' | 'question' | 'answer' | 'status'
  body: string
  visibility: NoteVisibility
  createdAt: string
}

// Admin project list: one project's corrections at a glance
export interface CorrectionSummary {
  projectId: string
  total: number
  withTeam: number
  withClient: number
  closed: number
  // Corrections sent back at least once, and how many times fixes were sent back in all
  reopened: number
  reopens: number
}

export interface Correction {
  id: string
  projectId: string
  number: number
  pageId: string | null
  page?: Pick<ProjectPage, 'id' | 'path' | 'url' | 'title'> | null
  pageUrl: string | null
  createdById: string | null
  createdBy?: Pick<User, 'id' | 'name' | 'role'> | null
  title: string
  body: string
  priority: CorrectionPriority
  viewport: CorrectionViewport | null
  status: CorrectionStatus
  reopenCount: number
  // The board task it is worked on; the task itself is returned to the team only
  taskId: string | null
  task?: (Pick<ProjectTask, 'id' | 'title' | 'completed' | 'inProgressAt' | 'sprintId' | 'assignedFreelancerId'> & {
    assignedFreelancer?: { id: string; user?: { id: string; name: string } } | null
  }) | null
  comments: CorrectionComment[]
  screenshots: Pick<ProjectDocument, 'id' | 'name' | 'mimeType' | 'size' | 'createdAt'>[]
  createdAt: string
  updatedAt: string
}
