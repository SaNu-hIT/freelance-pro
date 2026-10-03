import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateWorklogDto {
  @IsUUID()
  projectId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.25)
  @Max(24)
  hoursWorked: number;

  @IsString()
  @IsNotEmpty()
  tasksCompleted: string;

  // Left out when the project has no tasks to measure progress by, so the project keeps its progress
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  blockers?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}

export class UpdateWorklogDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hoursWorked?: number;

  @IsOptional()
  @IsString()
  tasksCompleted?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  blockers?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;
}
