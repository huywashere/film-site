import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @IsString()
  @MinLength(8, { message: "Mật khẩu phải chứa ít nhất 8 ký tự" })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class LoginDto {
  @IsString()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class VerifyEmailDto {
  @IsString()
  @MaxLength(512)
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token: string;

  @IsString()
  @MinLength(8, { message: "Mật khẩu phải chứa ít nhất 8 ký tự" })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
  })
  newPassword: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class TwoFactorLoginVerifyDto {
  @IsString()
  @MaxLength(2048)
  tempToken: string;

  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{8})$/i)
  code: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: "Mật khẩu phải chứa ít nhất 8 ký tự" })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
  })
  newPassword: string;
}

export class LockAccountDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token: string;
}
