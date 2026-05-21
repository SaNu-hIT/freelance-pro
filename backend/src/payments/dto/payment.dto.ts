import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  freelancerId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsIn(['pending', 'paid', 'partial'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
