import { IsArray, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ListUsersQuery {
  @IsOptional()
  @IsIn(['admin', 'freelancer', 'client'])
  role?: string;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;
}

// Admin creates a client account; the admin shares the temporary password with the client
export class CreateClientDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// Admin creates an approved freelancer: account plus profile in one step
export class CreateFreelancerDto extends CreateClientDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsIn(['professional', 'intern'])
  track?: string;
}

// Admin edits another user's account details
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;
}

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class DeleteMeDto {
  @IsString()
  password: string;
}
