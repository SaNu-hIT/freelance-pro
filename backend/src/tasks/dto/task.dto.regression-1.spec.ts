// Regression: ISSUE-034 — POST /tasks saved a task with an empty title
// Found by /qa on 2026-10-04
// Report: .gstack/qa-reports/run-20261003T230404Z-functional/qa-report-freelancepro-api-2026-10-04.md
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateTaskDto, UpdateTaskDto } from './task.dto'

const errorsFor = async (cls: any, body: object) =>
  (await validate(plainToInstance(cls, body), { whitelist: true })).map((e) => e.property)

const P = '6f1c1f0e-3b7a-4c8e-9a51-0d2f4b6c8e10'

describe('task DTOs', () => {
  it('rejects a task with an empty title or a bad project id', async () => {
    expect(await errorsFor(CreateTaskDto, { projectId: P, title: '' })).toEqual(['title'])
    expect(await errorsFor(CreateTaskDto, { projectId: 'nope', title: 'Build login' })).toEqual(['projectId'])
  })

  it('accepts a task the admin board sends', async () => {
    expect(await errorsFor(CreateTaskDto, { projectId: P, title: 'Build login', order: 2, assignedFreelancerId: P })).toEqual([])
  })

  it('lets an update clear the sprint or assignee but not blank the title', async () => {
    expect(await errorsFor(UpdateTaskDto, { sprintId: null, assignedFreelancerId: null, completed: true })).toEqual([])
    expect(await errorsFor(UpdateTaskDto, { title: '' })).toEqual(['title'])
  })
})
