import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsIn,
  IsUUID,
  Min,
  MinLength,
  Max,
  IsNotEmpty,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// Empty link fields arrive as '' from the form; only check a URL when one is given
const HTTP_URL = { protocols: ['http', 'https'], require_protocol: true };
const hasValue = (_: object, v: unknown) => v !== '' && v != null;

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsNumber()
  @Min(0, { message: 'Budget cannot be negative' })
  budget: number;

  @IsDateString({}, { message: 'Deadline must be a valid date' })
  deadline: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ValidateIf(hasValue)
  @IsUrl(HTTP_URL, { message: 'Repository URL must start with http:// or https://' })
  repoUrl?: string;

  @ValidateIf(hasValue)
  @IsUrl(HTTP_URL, { message: 'Live URL must start with http:// or https://' })
  liveUrl?: string;

  @ValidateIf(hasValue)
  @IsUrl(HTTP_URL, { message: 'Correction sheet URL must start with http:// or https://' })
  correctionSheetUrl?: string;

  // Admin only: the client account that owns the project. Ignored for clients.
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsIn([
    'new', 'assigned', 'in_progress', 'blocked',
    'pending_approval', 'completed', 'delayed',
  ])
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  teamMemberIds?: string[];
}

export class RequestChangesDto {
  @IsString()
  @MinLength(1)
  message: string;
}
