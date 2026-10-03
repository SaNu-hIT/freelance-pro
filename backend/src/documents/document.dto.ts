import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsIn(['deliverable', 'contract', 'report', 'invoice', 'attachment'])
  type?: string;

  @IsOptional()
  @IsIn(['delivered', 'in-review'])
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsIn(['deliverable', 'contract', 'report', 'invoice', 'attachment'])
  type?: string;

  @IsOptional()
  @IsIn(['delivered', 'in-review'])
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ListDocumentsQuery {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
