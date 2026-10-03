// Regression: ISSUE-033 — PATCH /freelancers/:id saved a negative hourly rate and experience
// Found by /qa on 2026-10-04
// Report: .gstack/qa-reports/run-20261003T230404Z-functional/qa-report-freelancepro-api-2026-10-04.md
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { UpdateFreelancerDto } from './freelancer.dto'

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(UpdateFreelancerDto, body), { whitelist: true })).map((e) => e.property)

describe('UpdateFreelancerDto', () => {
  it('rejects a negative hourly rate or experience', async () => {
    expect(await errorsFor({ hourlyRate: -10, experience: -1 })).toEqual(['experience', 'hourlyRate'])
  })

  it('accepts zero and positive values', async () => {
    expect(await errorsFor({ hourlyRate: 0, experience: 0 })).toEqual([])
    expect(await errorsFor({ hourlyRate: 45.5, experience: 3 })).toEqual([])
  })
})
