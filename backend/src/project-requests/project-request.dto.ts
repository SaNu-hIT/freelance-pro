import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateProjectRequestDto {
  @IsUUID()
  projectId: string;

  @IsIn(['question', 'change', 'escalation'])
  kind: 'question' | 'change' | 'escalation';

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsIn(['normal', 'high', 'critical'])
  urgency?: string;
}

export class ResolveProjectRequestDto {
  @IsOptional()
  @IsString()
  reply?: string;
}

export class ListProjectRequestsQuery {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(['question', 'change', 'escalation'])
  kind?: string;

  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: string;
}
