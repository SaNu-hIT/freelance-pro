import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CORRECTION_STATUSES } from '../entities/correction.entity';
import type {
  CorrectionPriority,
  CorrectionStatus,
  CorrectionViewport,
} from '../entities/correction.entity';

const PRIORITIES = ['low', 'normal', 'high'];
const VIEWPORTS = ['desktop', 'mobile', 'both'];

export class ListCorrectionsQuery {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  pageId?: string;

  @IsOptional()
  @IsIn(CORRECTION_STATUSES)
  status?: CorrectionStatus;
}

export class CreateCorrectionDto {
  @IsUUID()
  projectId: string;

  // Leave out for a correction about the whole site
  @IsOptional()
  @IsUUID()
  pageId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: CorrectionPriority;

  @IsOptional()
  @IsIn(VIEWPORTS)
  viewport?: CorrectionViewport;
}

export class UpdateCorrectionDto {
  // null moves it to the whole site
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  pageId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: CorrectionPriority;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsIn(VIEWPORTS)
  viewport?: CorrectionViewport | null;

  @IsOptional()
  @IsIn(CORRECTION_STATUSES)
  status?: CorrectionStatus;
}

export class CreateCorrectionCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  // question asks the client for input and waits on them (team only)
  @IsOptional()
  @IsIn(['comment', 'question'])
  kind?: 'comment' | 'question';

  @IsOptional()
  @IsIn(['internal', 'client'])
  visibility?: 'internal' | 'client';
}
