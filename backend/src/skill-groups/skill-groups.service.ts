import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillGroup } from '../entities/skill-group.entity';

const SEED_GROUPS = [
  { name: 'Mobile Development',  color: '#34d399', order: 0, skills: ['Flutter', 'Dart', 'React Native', 'Expo', 'iOS', 'Android', 'Firebase', 'Firestore'] },
  { name: 'Frontend',            color: '#60a5fa', order: 1, skills: ['React', 'Vue.js', 'Angular', 'TypeScript', 'Tailwind CSS', 'CSS', 'Next.js', 'GraphQL', 'Figma'] },
  { name: 'Backend',             color: '#818cf8', order: 2, skills: ['Node.js', 'NestJS', 'Python', 'Django', 'FastAPI', 'PHP', 'Laravel', 'REST API', 'GraphQL'] },
  { name: 'E-Commerce / CMS',    color: '#a78bfa', order: 3, skills: ['WordPress', 'Shopify', 'WooCommerce', 'Magento', 'Webflow', 'Strapi', 'Contentful'] },
  { name: 'Cloud / DevOps',      color: '#fb923c', order: 4, skills: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'] },
  { name: 'Database',            color: '#fbbf24', order: 5, skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Firebase', 'Firestore'] },
  { name: 'Design',              color: '#f472b6', order: 6, skills: ['Figma', 'UI/UX', 'Adobe XD', 'CSS'] },
]

@Injectable()
export class SkillGroupsService implements OnModuleInit {
  constructor(
    @InjectRepository(SkillGroup)
    private repo: Repository<SkillGroup>,
  ) {}

  async onModuleInit() {
    // Upsert by name so repeated restarts are idempotent
    for (const seed of SEED_GROUPS) {
      const exists = await this.repo.findOne({ where: { name: seed.name } })
      if (!exists) {
        await this.repo.save(this.repo.create(seed))
      }
    }
    // Remove exact duplicates (same name) keeping the oldest
    const all = await this.repo.find({ order: { createdAt: 'ASC' } })
    const seen = new Set<string>()
    const toDelete: string[] = []
    for (const g of all) {
      if (seen.has(g.name)) toDelete.push(g.id)
      else seen.add(g.name)
    }
    if (toDelete.length > 0) {
      await this.repo.delete(toDelete)
    }
  }

  findAll(): Promise<SkillGroup[]> {
    return this.repo.find({ order: { order: 'ASC', createdAt: 'ASC' } })
  }

  async create(data: { name: string; color?: string; skills?: string[] }): Promise<SkillGroup> {
    const count = await this.repo.count()
    const group = this.repo.create({ ...data, skills: data.skills ?? [], order: count })
    return this.repo.save(group)
  }

  async update(id: string, data: Partial<{ name: string; color: string; skills: string[]; order: number }>): Promise<SkillGroup> {
    const group = await this.repo.findOne({ where: { id } })
    if (!group) throw new NotFoundException(`Skill group ${id} not found`)
    Object.assign(group, data)
    return this.repo.save(group)
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const group = await this.repo.findOne({ where: { id } })
    if (!group) throw new NotFoundException(`Skill group ${id} not found`)
    await this.repo.remove(group)
    return { deleted: true }
  }

  async addSkill(id: string, skill: string): Promise<SkillGroup> {
    const group = await this.repo.findOne({ where: { id } })
    if (!group) throw new NotFoundException(`Skill group ${id} not found`)
    if (!group.skills.includes(skill)) group.skills = [...group.skills, skill]
    return this.repo.save(group)
  }

  async removeSkill(id: string, skill: string): Promise<SkillGroup> {
    const group = await this.repo.findOne({ where: { id } })
    if (!group) throw new NotFoundException(`Skill group ${id} not found`)
    group.skills = group.skills.filter(s => s !== skill)
    return this.repo.save(group)
  }
}
