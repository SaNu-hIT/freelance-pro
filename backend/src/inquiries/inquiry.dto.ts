import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

// The form posts '' for fields left blank
const blankToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value))

export class CreateInquiryDto {
  @IsIn(['project_idea', 'callback'])
  type: 'project_idea' | 'callback'

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string

  // Project ideas need an email to reply to; callbacks need a phone number and email is optional
  @blankToUndefined()
  @ValidateIf((o) => o.type !== 'callback' || o.email !== undefined)
  @IsEmail()
  @MaxLength(200)
  email?: string

  @blankToUndefined()
  @ValidateIf((o) => o.type === 'callback' || o.phone !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone?: string

  @IsOptional() @IsString() @MaxLength(200)
  projectTitle?: string

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string

  @IsOptional() @IsString() @MaxLength(100)
  budgetRange?: string

  @IsOptional() @IsString() @MaxLength(100)
  timeline?: string

  @IsOptional() @IsString() @MaxLength(100)
  preferredCallbackTime?: string
}

export class UpdateInquiryStatusDto {
  @IsIn(['new', 'contacted', 'converted', 'closed'])
  status: string
}
