import { IsEmail, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

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
