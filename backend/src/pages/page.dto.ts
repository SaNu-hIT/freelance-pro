import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ListPagesQuery {
  @IsUUID()
  projectId: string;
}

export class CreatePageDto {
  @IsUUID()
  projectId: string;

  // A full URL, or a path like /about that is resolved against the project's live URL
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class DiscoverPagesDto {
  @IsUUID()
  projectId: string;

  // The website to read; defaults to the project's live URL
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;
}

export class CreatePageNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsIn(['internal', 'client'])
  visibility?: 'internal' | 'client';
}
