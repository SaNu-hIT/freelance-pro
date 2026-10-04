import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  title: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @IsOptional()
  @IsUUID()
  assignedFreelancerId?: string;
}

// startedAt is when the freelancer's timer session began, so a reload or task switch keeps the real start
export class StartTaskDto {
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}

// null clears the sprint or assignee
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsBoolean()
  inProgress?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  sprintId?: string | null;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  assignedFreelancerId?: string | null;
}
