import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { FreelancerProfile } from './entities/freelancer-profile.entity';
import { Project } from './entities/project.entity';
import { Worklog } from './entities/worklog.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectSprint } from './entities/project-sprint.entity';

async function seed() {
  const reset = process.argv.includes('--reset');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'freelance_pro',
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: true,
  });

  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(FreelancerProfile);
  const projectRepo = dataSource.getRepository(Project);
  const worklogRepo = dataSource.getRepository(Worklog);
  const taskRepo = dataSource.getRepository(ProjectTask);
  const sprintRepo = dataSource.getRepository(ProjectSprint);

  if (reset) {
    console.log('Resetting database...');
    await dataSource.query('DELETE FROM project_tasks');
    await dataSource.query('DELETE FROM project_sprints');
    await dataSource.query('DELETE FROM worklogs');
    await dataSource.query('DELETE FROM payments');
    await dataSource.query('DELETE FROM projects');
    await dataSource.query('DELETE FROM freelancer_profiles');
    await dataSource.query('DELETE FROM inquiries');
    await dataSource.query('DELETE FROM users');
    console.log('Reset complete.');
  } else {
    const existing = await userRepo.findOne({ where: { email: 'admin@freelancepro.com' } });
    if (existing) {
      console.log('Already seeded. Run with --reset to re-seed.');
      await dataSource.destroy();
      return;
    }
  }

  const hash = async (p: string) => bcrypt.hash(p, 10);

  // ── Admin ──────────────────────────────────────
  const admin = await userRepo.save(userRepo.create({
    email: 'admin@freelancepro.com',
    password: await hash('Admin@123'),
    name: 'Admin User',
    role: 'admin',
  }));
  console.log('Created admin:', admin.email);

  // ── Clients ────────────────────────────────────
  const client1 = await userRepo.save(userRepo.create({
    email: 'acme@corp.com',
    password: await hash('Test@123'),
    name: 'Acme Corp',
    role: 'client',
  }));

  const client2 = await userRepo.save(userRepo.create({
    email: 'nexus@labs.io',
    password: await hash('Test@123'),
    name: 'Nexus Labs',
    role: 'client',
  }));

  const client3 = await userRepo.save(userRepo.create({
    email: 'dataflow@inc.com',
    password: await hash('Test@123'),
    name: 'DataFlow Inc',
    role: 'client',
  }));

  console.log('Created 3 clients');

  // ── Freelancers ────────────────────────────────
  const fUser1 = await userRepo.save(userRepo.create({
    email: 'alex@freelancepro.dev',
    password: await hash('Test@123'),
    name: 'Alex Rivera',
    role: 'freelancer',
  }));
  const profile1 = await profileRepo.save(profileRepo.create({
    userId: fUser1.id,
    user: fUser1,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL'],
    experience: 5,
    hourlyRate: 85,
    status: 'active',
    bio: 'Full-stack developer specialising in React and Node.js with a strong focus on performance and clean architecture.',
  }));

  const fUser2 = await userRepo.save(userRepo.create({
    email: 'priya@freelancepro.dev',
    password: await hash('Test@123'),
    name: 'Priya Sharma',
    role: 'freelancer',
  }));
  const profile2 = await profileRepo.save(profileRepo.create({
    userId: fUser2.id,
    user: fUser2,
    skills: ['Python', 'Django', 'FastAPI', 'AWS', 'Machine Learning'],
    experience: 6,
    hourlyRate: 95,
    status: 'active',
    bio: 'Python backend engineer and ML practitioner. Built data pipelines and REST APIs for enterprise clients across 3 continents.',
  }));

  const fUser3 = await userRepo.save(userRepo.create({
    email: 'marcus@freelancepro.dev',
    password: await hash('Test@123'),
    name: 'Marcus Chen',
    role: 'freelancer',
  }));
  const profile3 = await profileRepo.save(profileRepo.create({
    userId: fUser3.id,
    user: fUser3,
    skills: ['Flutter', 'React Native', 'iOS', 'Android', 'Firebase'],
    experience: 4,
    hourlyRate: 80,
    status: 'active',
    bio: 'Mobile-first engineer. Shipped 12+ apps on both iOS and Android — from design handoff to App Store launch.',
  }));

  const fUser4 = await userRepo.save(userRepo.create({
    email: 'zara@freelancepro.dev',
    password: await hash('Test@123'),
    name: 'Zara Ahmed',
    role: 'freelancer',
  }));
  const profile4 = await profileRepo.save(profileRepo.create({
    userId: fUser4.id,
    user: fUser4,
    skills: ['Figma', 'UI/UX Design', 'React', 'Vue.js', 'Design Systems'],
    experience: 7,
    hourlyRate: 90,
    status: 'active',
    bio: 'Designer-developer hybrid. I create and code design systems that teams actually enjoy using.',
  }));

  const fUser5 = await userRepo.save(userRepo.create({
    email: 'lucas@freelancepro.dev',
    password: await hash('Test@123'),
    name: 'Lucas Oliveira',
    role: 'freelancer',
  }));
  const profile5 = await profileRepo.save(profileRepo.create({
    userId: fUser5.id,
    user: fUser5,
    skills: ['DevOps', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'AWS'],
    experience: 8,
    hourlyRate: 110,
    status: 'active',
    bio: 'Infrastructure and DevOps specialist. I turn manual deployment nightmares into automated, zero-downtime pipelines.',
  }));

  console.log('Created 5 freelancers');

  // ── Projects ────────────────────────────────────
  const today = new Date();
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const p1 = await projectRepo.save(projectRepo.create({
    title: 'E-Commerce Platform Rebuild',
    description: 'Complete rebuild of the legacy e-commerce stack using React, Node.js, and PostgreSQL. Includes product catalogue, cart, checkout, inventory management, and admin panel.',
    budget: 14500, deadline: daysFromNow(42), status: 'in_progress', priority: 'high',
    clientId: client1.id, assignedTo: profile1.id, progress: 65,
    requirements: 'Stripe payment integration, multi-currency support, mobile-responsive, sub-3s load times, SEO-optimised product pages.',
    repoUrl: 'https://github.com/acme-corp/ecommerce-rebuild',
    liveUrl: 'https://staging.acme-store.com',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/ecommerce-corrections',
  }));

  const p2 = await projectRepo.save(projectRepo.create({
    title: 'Analytics Dashboard',
    description: 'Real-time analytics dashboard with D3 charts, KPI cards, and filterable data tables. Connects to existing PostgreSQL data warehouse via REST API.',
    budget: 8500, deadline: daysFromNow(60), status: 'in_progress', priority: 'medium',
    clientId: client2.id, assignedTo: profile2.id, progress: 38,
    requirements: 'Live data refresh every 30s, date-range filters, CSV export, role-based dashboard views.',
    repoUrl: 'https://github.com/nexus-labs/analytics-dashboard',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/analytics-corrections',
  }));

  const p3 = await projectRepo.save(projectRepo.create({
    title: 'Mobile App — iOS & Android',
    description: 'Cross-platform Flutter app for food delivery. Includes customer-facing app, delivery driver app, and real-time order tracking.',
    budget: 18000, deadline: daysFromNow(90), status: 'in_progress', priority: 'critical',
    clientId: client1.id, assignedTo: profile3.id, progress: 45,
    requirements: 'Offline support, push notifications, Google Maps integration, payment via Stripe, dark mode.',
    repoUrl: 'https://github.com/acme-corp/food-delivery-app',
    liveUrl: 'https://testflight.apple.com/join/acme-food',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/mobile-corrections',
  }));

  const p4 = await projectRepo.save(projectRepo.create({
    title: 'Brand Refresh & Design System',
    description: 'Full brand refresh including logo redesign, Figma component library, and React implementation of the design system across all web properties.',
    budget: 11000, deadline: daysFromNow(25), status: 'pending_approval', priority: 'high',
    clientId: client3.id, assignedTo: profile4.id, progress: 88,
    requirements: 'Deliver Figma source files, Storybook documentation, and npm-published component package.',
    repoUrl: 'https://github.com/dataflow/design-system',
    liveUrl: 'https://storybook.dataflow.io',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/design-corrections',
  }));

  const p5 = await projectRepo.save(projectRepo.create({
    title: 'Cloud Migration & DevOps Setup',
    description: 'Migrate on-premise infrastructure to AWS. Set up Kubernetes cluster, Terraform IaC, GitHub Actions CI/CD, monitoring with Grafana and alerting.',
    budget: 22000, deadline: daysFromNow(75), status: 'assigned', priority: 'critical',
    clientId: client2.id, assignedTo: profile5.id, progress: 20,
    requirements: 'Zero-downtime migration, 99.9% uptime SLA, automated rollback, secrets management with Vault.',
    repoUrl: 'https://github.com/nexus-labs/infra-terraform',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/devops-corrections',
  }));

  const p6 = await projectRepo.save(projectRepo.create({
    title: 'CRM System Integration',
    description: 'Integrate Salesforce CRM with internal Node.js backend and React frontend. Bi-directional data sync, webhook handling, and custom SF components.',
    budget: 9800, deadline: daysFromNow(15), status: 'blocked', priority: 'high',
    clientId: client1.id, assignedTo: profile1.id, progress: 52,
    requirements: 'Salesforce API v58, OAuth2 PKCE flow, real-time sync via webhooks, audit log.',
    repoUrl: 'https://github.com/acme-corp/crm-integration',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/crm-corrections',
  }));

  const p7 = await projectRepo.save(projectRepo.create({
    title: 'AI Chatbot API',
    description: 'GPT-4 powered customer support chatbot API with context memory, escalation to human agents, and integration hooks for Zendesk and Intercom.',
    budget: 13500, deadline: daysFromNow(55), status: 'new', priority: 'medium',
    clientId: client3.id, progress: 0,
    requirements: 'Multi-turn context, intent classification, tone guardrails, usage analytics endpoint.',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/chatbot-requirements',
  }));

  const p8 = await projectRepo.save(projectRepo.create({
    title: 'PWA Storefront',
    description: 'Progressive Web App storefront for a boutique fashion brand. Headless commerce with Shopify Storefront API, Next.js, and full offline capability.',
    budget: 7200, deadline: daysFromNow(35), status: 'assigned', priority: 'medium',
    clientId: client3.id, assignedTo: profile4.id, progress: 10,
    requirements: 'Lighthouse score >95, service worker, push notifications for order updates, ADA compliant.',
    repoUrl: 'https://github.com/dataflow/pwa-storefront',
    liveUrl: 'https://staging.dataflow-store.com',
    correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/pwa-corrections',
  }));

  console.log('Created 8 projects');

  // ── Team Members (ManyToMany) ────────────────────
  p1.teamMembers = [profile1, profile2, profile5]; // full-stack + backend + DevOps
  p2.teamMembers = [profile2, profile3];            // backend + mobile/data
  p3.teamMembers = [profile3, profile1, profile4]; // mobile + full-stack + design
  p4.teamMembers = [profile4, profile2];            // design + backend
  p5.teamMembers = [profile5, profile1];            // DevOps + full-stack
  p6.teamMembers = [profile1, profile2];            // full-stack + backend
  p7.teamMembers = [profile2, profile3, profile5]; // backend + ML + DevOps
  p8.teamMembers = [profile4, profile1];            // design + full-stack
  await projectRepo.save([p1, p2, p3, p4, p5, p6, p7, p8]);
  console.log('Assigned team members to all projects');

  // ── Sprints + Tasks ─────────────────────────────
  type SprintDef = { name: string; startDate: string; endDate: string; tasks: string[] };
  type ProjectDef = { project: Project; team: string[]; sprints: SprintDef[] };

  const projectDefs: ProjectDef[] = [
    {
      project: p1,
      team: [profile1.id, profile2.id, profile5.id],
      sprints: [
        {
          name: 'Sprint 1 — Foundation',
          startDate: daysFromNow(-35), endDate: daysFromNow(-22),
          tasks: ['Set up Next.js project with TypeScript and ESLint', 'Design and implement database schema', 'Build product catalogue with search and filters'],
        },
        {
          name: 'Sprint 2 — Core Commerce',
          startDate: daysFromNow(-21), endDate: daysFromNow(-8),
          tasks: ['Integrate Stripe payment gateway', 'Implement shopping cart with persistent state'],
        },
        {
          name: 'Sprint 3 — Admin & Launch',
          startDate: daysFromNow(-7), endDate: daysFromNow(14),
          tasks: ['Build order management admin panel', 'Write unit and integration tests', 'Deploy to production and configure CDN'],
        },
      ],
    },
    {
      project: p2,
      team: [profile2.id, profile3.id],
      sprints: [
        {
          name: 'Sprint 1 — Data Layer',
          startDate: daysFromNow(-30), endDate: daysFromNow(-16),
          tasks: ['Connect to PostgreSQL data warehouse', 'Build KPI metrics API endpoints'],
        },
        {
          name: 'Sprint 2 — Visualisation',
          startDate: daysFromNow(-15), endDate: daysFromNow(-1),
          tasks: ['Implement D3 chart components (line, bar, pie)', 'Add date-range filter controls'],
        },
        {
          name: 'Sprint 3 — Features & Polish',
          startDate: daysFromNow(0), endDate: daysFromNow(20),
          tasks: ['Build CSV export functionality', 'Implement role-based dashboard views', 'Performance optimisation and caching'],
        },
      ],
    },
    {
      project: p3,
      team: [profile3.id, profile1.id, profile4.id],
      sprints: [
        {
          name: 'Sprint 1 — Auth & Setup',
          startDate: daysFromNow(-50), endDate: daysFromNow(-37),
          tasks: ['Set up Flutter project with flavors (dev/prod)', 'Implement Firebase Authentication'],
        },
        {
          name: 'Sprint 2 — Customer App',
          startDate: daysFromNow(-36), endDate: daysFromNow(-22),
          tasks: ['Build customer app: home, menu, cart screens'],
        },
        {
          name: 'Sprint 3 — Driver App',
          startDate: daysFromNow(-21), endDate: daysFromNow(-7),
          tasks: ['Build driver app: order queue and navigation', 'Integrate Google Maps for real-time tracking'],
        },
        {
          name: 'Sprint 4 — Payments & QA',
          startDate: daysFromNow(-6), endDate: daysFromNow(30),
          tasks: ['Set up push notifications (FCM)', 'Integrate Stripe for in-app payments', 'QA on physical iOS and Android devices'],
        },
      ],
    },
    {
      project: p4,
      team: [profile4.id, profile2.id],
      sprints: [
        {
          name: 'Sprint 1 — Brand Identity',
          startDate: daysFromNow(-40), endDate: daysFromNow(-27),
          tasks: ['Audit existing brand assets and gather feedback', 'Design new logo and brand mark'],
        },
        {
          name: 'Sprint 2 — Component Library',
          startDate: daysFromNow(-26), endDate: daysFromNow(-10),
          tasks: ['Create Figma component library (atoms → organisms)', 'Implement React component package'],
        },
        {
          name: 'Sprint 3 — Docs & Release',
          startDate: daysFromNow(-9), endDate: daysFromNow(5),
          tasks: ['Write Storybook documentation for all components', 'Publish npm package and tag v1.0.0'],
        },
      ],
    },
    {
      project: p5,
      team: [profile5.id, profile1.id],
      sprints: [
        {
          name: 'Sprint 1 — Audit & IaC',
          startDate: daysFromNow(-20), endDate: daysFromNow(-7),
          tasks: ['Audit existing on-premise infrastructure', 'Write Terraform modules for VPC, EKS, RDS'],
        },
        {
          name: 'Sprint 2 — CI/CD & K8s',
          startDate: daysFromNow(-6), endDate: daysFromNow(14),
          tasks: ['Set up GitHub Actions CI/CD pipeline', 'Configure Kubernetes namespaces and RBAC'],
        },
        {
          name: 'Sprint 3 — Migration',
          startDate: daysFromNow(15), endDate: daysFromNow(40),
          tasks: ['Migrate databases with zero-downtime strategy', 'Set up Grafana + Prometheus monitoring'],
        },
        {
          name: 'Sprint 4 — Cutover',
          startDate: daysFromNow(41), endDate: daysFromNow(60),
          tasks: ['Configure HashiCorp Vault for secrets management', 'Final cutover and DNS update'],
        },
      ],
    },
    {
      project: p6,
      team: [profile1.id, profile2.id],
      sprints: [
        {
          name: 'Sprint 1 — Auth & Sync',
          startDate: daysFromNow(-25), endDate: daysFromNow(-12),
          tasks: ['Set up Salesforce connected app and OAuth2', 'Build bi-directional sync service'],
        },
        {
          name: 'Sprint 2 — Webhooks & UI',
          startDate: daysFromNow(-11), endDate: daysFromNow(0),
          tasks: ['Implement webhook receiver for SF events', 'Build custom Lightning component'],
        },
        {
          name: 'Sprint 3 — QA & Handoff',
          startDate: daysFromNow(1), endDate: daysFromNow(12),
          tasks: ['Write audit log service', 'End-to-end QA in SF sandbox'],
        },
      ],
    },
    {
      project: p7,
      team: [profile2.id, profile3.id, profile5.id],
      sprints: [
        {
          name: 'Sprint 1 — Core AI',
          startDate: daysFromNow(5), endDate: daysFromNow(19),
          tasks: ['Define conversation flows and intent taxonomy', 'Build context memory service (Redis-backed)', 'Integrate GPT-4 API with streaming'],
        },
        {
          name: 'Sprint 2 — Integrations',
          startDate: daysFromNow(20), endDate: daysFromNow(40),
          tasks: ['Implement escalation logic to human agents', 'Build Zendesk and Intercom webhook adapters', 'Usage analytics dashboard'],
        },
      ],
    },
    {
      project: p8,
      team: [profile4.id, profile1.id],
      sprints: [
        {
          name: 'Sprint 1 — Storefront',
          startDate: daysFromNow(-10), endDate: daysFromNow(5),
          tasks: ['Set up Next.js with Shopify Storefront API', 'Build product listing and PDP pages', 'Shopping cart with optimistic UI'],
        },
        {
          name: 'Sprint 2 — PWA & A11y',
          startDate: daysFromNow(6), endDate: daysFromNow(25),
          tasks: ['Implement service worker for offline support', 'Push notification subscription flow', 'Accessibility audit and fixes'],
        },
      ],
    },
  ];

  for (const { project, team, sprints } of projectDefs) {
    // Calculate how many total tasks are completed based on progress
    const allTasks = sprints.flatMap(s => s.tasks);
    const completedCount = Math.round((project.progress / 100) * allTasks.length);
    let taskIndex = 0;

    for (let si = 0; si < sprints.length; si++) {
      const sprintDef = sprints[si];
      const sprint = await sprintRepo.save(sprintRepo.create({
        projectId: project.id,
        name: sprintDef.name,
        order: si,
        startDate: sprintDef.startDate,
        endDate: sprintDef.endDate,
      }));

      for (let ti = 0; ti < sprintDef.tasks.length; ti++) {
        const isDone = taskIndex < completedCount;
        const task = taskRepo.create();
        task.projectId = project.id;
        task.sprintId = sprint.id;
        // Round-robin assign tasks to team members
        task.assignedFreelancerId = team[taskIndex % team.length];
        task.title = sprintDef.tasks[ti];
        task.completed = isDone;
        task.order = ti;
        if (isDone) task.completedAt = new Date(Date.now() - (allTasks.length - taskIndex) * 86400000);
        await taskRepo.save(task);
        taskIndex++;
      }
    }
  }

  console.log('Created sprints and checklist tasks for all projects');

  // ── Worklogs ────────────────────────────────────
  const dayStr = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const worklogs = [
    // p1 - Alex - E-Commerce
    {
      project: p1, freelancer: profile1, date: dayStr(0), hoursWorked: 7,
      tasksCompleted: 'Completed Stripe checkout flow integration. Added webhook handler for payment_intent.succeeded events. Wrote unit tests for cart service.',
      progress: 65, blockers: undefined,
      nextSteps: 'Start order management admin panel.',
    },
    {
      project: p1, freelancer: profile1, date: dayStr(1), hoursWorked: 6.5,
      tasksCompleted: 'Implemented product search with Postgres full-text search. Added category filters and price range slider.',
      progress: 60, blockers: undefined,
      nextSteps: 'Integrate Stripe checkout.',
    },
    {
      project: p1, freelancer: profile1, date: dayStr(3), hoursWorked: 8,
      tasksCompleted: 'Built shopping cart with Redux Toolkit. Cart persists in localStorage and syncs to DB on login.',
      progress: 55, blockers: undefined,
      nextSteps: 'Product search and filters.',
    },
    // p2 - Priya - Analytics
    {
      project: p2, freelancer: profile2, date: dayStr(0), hoursWorked: 6,
      tasksCompleted: 'Implemented D3 line charts for revenue and user growth metrics. Added 7/30/90-day toggle.',
      progress: 38, blockers: 'Waiting for client to grant read access to production data warehouse. Using mock data for now.',
      nextSteps: 'Build bar chart for channel attribution once DB access is granted.',
    },
    {
      project: p2, freelancer: profile2, date: dayStr(2), hoursWorked: 7,
      tasksCompleted: 'Connected to PostgreSQL via connection pooling. Built KPI endpoint returning total revenue, DAU, conversion rate.',
      progress: 30, blockers: undefined,
      nextSteps: 'D3 chart components.',
    },
    // p3 - Marcus - Mobile
    {
      project: p3, freelancer: profile3, date: dayStr(0), hoursWorked: 8,
      tasksCompleted: 'Google Maps integration for real-time driver tracking. Implemented WebSocket-based location broadcasting.',
      progress: 45, blockers: undefined,
      nextSteps: 'Push notifications setup with FCM.',
    },
    {
      project: p3, freelancer: profile3, date: dayStr(1), hoursWorked: 7.5,
      tasksCompleted: 'Built customer app home and menu screens. Product cards with image lazy-loading. Cart state management with Riverpod.',
      progress: 38, blockers: undefined,
      nextSteps: 'Google Maps for delivery tracking.',
    },
    {
      project: p3, freelancer: profile3, date: dayStr(4), hoursWorked: 6,
      tasksCompleted: 'Completed Firebase Auth setup (email/password + Google OAuth). User profile screen with avatar upload.',
      progress: 28, blockers: 'Google Maps API key billing needs to be set up on client account.',
      nextSteps: 'Customer home and menu screens.',
    },
    // p4 - Zara - Design System
    {
      project: p4, freelancer: profile4, date: dayStr(0), hoursWorked: 5,
      tasksCompleted: 'Final review pass on Storybook documentation. Fixed 3 accessibility issues found in audit. Prepping npm publish.',
      progress: 88, blockers: undefined,
      nextSteps: 'Publish npm package and submit for client approval.',
    },
    {
      project: p4, freelancer: profile4, date: dayStr(2), hoursWorked: 8,
      tasksCompleted: 'Completed all organism-level components (Header, Footer, DataTable, Modal). Full Figma-to-code parity achieved.',
      progress: 82, blockers: undefined,
      nextSteps: 'Storybook docs and npm package.',
    },
    // p5 - Lucas - DevOps
    {
      project: p5, freelancer: profile5, date: dayStr(0), hoursWorked: 9,
      tasksCompleted: 'Terraform modules for VPC and EKS cluster complete. CI pipeline builds Docker images and pushes to ECR. Deployed to staging.',
      progress: 20, blockers: 'Client IT team has not yet provided IAM credentials with required policies.',
      nextSteps: 'Configure Kubernetes namespaces and RBAC once access is granted.',
    },
    // p6 - Alex - CRM (blocked)
    {
      project: p6, freelancer: profile1, date: dayStr(1), hoursWorked: 4,
      tasksCompleted: 'Investigated Salesforce API rate limiting issue. Set up exponential backoff retry logic in sync service.',
      progress: 52,
      blockers: 'Salesforce sandbox environment is down for maintenance. Client needs to raise a ticket with SF support before we can continue.',
      nextSteps: 'Resume bi-directional sync once sandbox is back.',
    },
  ];

  for (const w of worklogs) {
    const wl = worklogRepo.create();
    wl.projectId = w.project.id;
    wl.freelancerId = w.freelancer.id;
    wl.date = w.date;
    wl.hoursWorked = w.hoursWorked;
    wl.tasksCompleted = w.tasksCompleted;
    wl.progress = w.progress;
    if (w.blockers) wl.blockers = w.blockers;
    if (w.nextSteps) wl.nextSteps = w.nextSteps;
    wl.fileUrls = [];
    await worklogRepo.save(wl);
  }

  console.log('Created worklogs');

  console.log('\n✅ Seed complete!\n');
  console.log('Admin:       admin@freelancepro.com  /  Admin@123');
  console.log('Client 1:    acme@corp.com           /  Test@123  (Acme Corp)');
  console.log('Client 2:    nexus@labs.io            /  Test@123  (Nexus Labs)');
  console.log('Client 3:    dataflow@inc.com         /  Test@123  (DataFlow Inc)');
  console.log('Freelancer:  alex@freelancepro.dev    /  Test@123  (Alex Rivera)');
  console.log('Freelancer:  priya@freelancepro.dev   /  Test@123  (Priya Sharma)');
  console.log('Freelancer:  marcus@freelancepro.dev  /  Test@123  (Marcus Chen)');
  console.log('Freelancer:  zara@freelancepro.dev    /  Test@123  (Zara Ahmed)');
  console.log('Freelancer:  lucas@freelancepro.dev   /  Test@123  (Lucas Oliveira)');

  await dataSource.destroy();
}

seed().catch(console.error);
