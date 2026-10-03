import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  // Public signup: admins are created via seed, never self-registered.
  @IsIn(['freelancer', 'client'])
  role: string;

  // Optional freelancer profile fields
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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

  // Optional client fields
  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
