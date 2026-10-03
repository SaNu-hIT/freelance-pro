import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

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
  @IsInt()
  order?: number;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  sprintId?: string | null;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  assignedFreelancerId?: string | null;
}
