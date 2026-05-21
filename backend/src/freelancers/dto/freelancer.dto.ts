import { IsOptional, IsArray, IsNumber, IsString, IsObject, IsIn } from 'class-validator';

export class UpdateFreelancerDto {
  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsNumber()
  experience?: number;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  track?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsObject()
  verifications?: Record<string, boolean>;
}

export class RejectFreelancerDto {
  @IsString()
  reason: string;
}

export class UpdateStageDto {
  @IsString()
  @IsIn(['applied', 'reviewing', 'assessment', 'approved', 'rejected'])
  stage: string;
}
