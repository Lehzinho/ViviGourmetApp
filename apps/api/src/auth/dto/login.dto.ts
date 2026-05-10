import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** Obrigatório se o usuário pertencer a mais de uma empresa ativa. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyId?: string;
}
