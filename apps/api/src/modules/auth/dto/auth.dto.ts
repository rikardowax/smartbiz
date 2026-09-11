import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Role } from "../../../generated/prisma/enums.js";

/** Normalise un numéro camerounais/international en `+237699000001`. */
const normalizePhone = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/[\s().-]/g, "") : value;

export class RegisterDto {
  @ApiProperty({ example: "Awa" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  firstName: string;

  @ApiProperty({ example: "Ngono" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lastName: string;

  @ApiProperty({ example: "+237699000001" })
  @Transform(normalizePhone)
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  phone: string;

  @ApiPropertyOptional({ example: "awa@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "Adresse e-mail invalide" })
  email?: string;

  @ApiProperty({ example: "MotDePasse123", minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ enum: [Role.ACHETEUR, Role.VENDEUR], default: Role.ACHETEUR })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: "+237699000001", description: "Numéro de téléphone ou e-mail" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: "MotDePasse123" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GoogleLoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  credential: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "+237699000001" })
  @Transform(normalizePhone)
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "+237699000001" })
  @Transform(normalizePhone)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: "483920", description: "Code à 6 chiffres reçu par SMS" })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: ["fr", "en"] })
  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;
}
