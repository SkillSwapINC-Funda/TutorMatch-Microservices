import { IsEmail, IsString, IsNotEmpty, MinLength, IsIn, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsIn(['student', 'tutor'])
  role: 'student' | 'tutor';

  @IsString()
  @IsIn(['M', 'F', 'O'])
  gender: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  semesterNumber: number;

  @IsString()
  @IsOptional()
  academicYear?: string;
}

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
