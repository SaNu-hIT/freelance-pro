import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateInquiryDto, UpdateInquiryStatusDto } from './inquiry.dto'

const errorsFor = async (cls: any, body: object) =>
  (await validate(plainToInstance(cls, body), { whitelist: true })).map((e) => e.property)

describe('inquiry DTOs', () => {
  it('rejects an empty enquiry instead of letting the insert fail', async () => {
    expect(await errorsFor(CreateInquiryDto, {})).toEqual(['type', 'name', 'email'])
  })

  it('accepts a callback request with no email, as the form allows', async () => {
    expect(await errorsFor(CreateInquiryDto, { type: 'callback', name: 'Sam', email: '', phone: '123' })).toEqual([])
  })

  it('needs a phone for a callback and an email for a project idea', async () => {
    expect(await errorsFor(CreateInquiryDto, { type: 'callback', name: 'Sam' })).toEqual(['phone'])
    expect(await errorsFor(CreateInquiryDto, { type: 'project_idea', name: 'Sam', email: '' })).toEqual(['email'])
  })

  it('only allows known statuses', async () => {
    expect(await errorsFor(UpdateInquiryStatusDto, { status: 'deleted' })).toEqual(['status'])
    expect(await errorsFor(UpdateInquiryStatusDto, { status: 'contacted' })).toEqual([])
  })
})
