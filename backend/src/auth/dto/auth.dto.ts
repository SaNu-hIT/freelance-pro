import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
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

  @IsIn(['admin', 'freelancer', 'client'])
  role: string;

  // Optional freelancer profile fields
  skills?: string[];
  experience?: number;
  hourlyRate?: number;
  bio?: string;

  // Optional client fields
  company?: string;
}
