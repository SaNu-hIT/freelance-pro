import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsIn,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateProjectDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  budget: number;

  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  repoUrl?: string;

  @IsOptional()
  @IsString()
  liveUrl?: string;

  @IsOptional()
  @IsString()
  correctionSheetUrl?: string;
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
