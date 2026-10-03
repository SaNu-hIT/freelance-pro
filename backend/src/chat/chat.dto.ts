import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}

export class MarkReadDto {
  @IsUUID()
  projectId: string;
}

export class ChatQuery {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  // Kept so older clients that still send ?by= are not rejected; the role decides
  @IsOptional()
  @IsIn(['admin', 'client'])
  by?: string;
}
