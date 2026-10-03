import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateProjectDto, UpdateProjectDto } from './project.dto'

const errorsFor = async (cls: any, body: object) =>
  (await validate(plainToInstance(cls, body), { whitelist: true })).map((e) => e.property)

const valid = { title: 'Site', description: 'Build it', budget: 100, deadline: '2026-12-01' }

describe('project DTOs', () => {
  it('accepts a project with empty optional links, as the admin form sends them', async () => {
    expect(await errorsFor(CreateProjectDto, { ...valid, repoUrl: '', liveUrl: '', correctionSheetUrl: '' })).toEqual([])
  })

  it('rejects blank title and description, a negative budget and a missing deadline', async () => {
    expect(await errorsFor(CreateProjectDto, { title: ' ', description: '', budget: -1 }))
      .toEqual(['description', 'budget', 'deadline'])
    expect(await errorsFor(CreateProjectDto, { ...valid, title: '' })).toEqual(['title'])
  })

  it('only allows http(s) links', async () => {
    expect(await errorsFor(CreateProjectDto, { ...valid, repoUrl: 'github.com/org/repo', liveUrl: 'javascript:alert(1)' }))
      .toEqual(['repoUrl', 'liveUrl'])
    expect(await errorsFor(CreateProjectDto, { ...valid, repoUrl: 'https://github.com/org/repo' })).toEqual([])
  })

  it('lets an update change a single field', async () => {
    expect(await errorsFor(UpdateProjectDto, { status: 'in_progress' })).toEqual([])
    expect(await errorsFor(UpdateProjectDto, { title: '' })).toEqual(['title'])
  })
})
