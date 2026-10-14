import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const TASK_TYPES = [
  'request',
  'correction',
  'question',
  'complaint',
  'other',
] as const;
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const ATTACHMENT_TYPES = ['image', 'audio', 'document'] as const;

export class AttachmentDto {
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'attachment url must be an http(s) URL' },
  )
  @MaxLength(2000)
  url: string;

  @IsIn(ATTACHMENT_TYPES)
  type: (typeof ATTACHMENT_TYPES)[number];
}

export class CreateExternalTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_TYPES)
  type?: (typeof TASK_TYPES)[number];

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: (typeof TASK_PRIORITIES)[number];

  @IsOptional()
  @IsIn(['whatsapp'])
  source?: 'whatsapp';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customer_name?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'customer_phone must be E.164, e.g. +971501234567',
  })
  customer_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  original_message?: string;

  @IsString()
  @IsNotEmpty({ message: 'message_id is required' })
  @MaxLength(255)
  message_id: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'received_at must be an ISO 8601 timestamp' },
  )
  received_at?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
