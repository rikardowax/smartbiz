import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";

const normalizePhone = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/[\s().-]/g, "") : value;

export class CreateCustomerDto {
  @ApiProperty({ example: "Jeanne Atangana" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "+237655334455" })
  @Transform(normalizePhone)
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "Yaoundé" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: "Cliente fidèle, paie souvent par Mobile Money." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CreateSupplierDto {
  @ApiProperty({ example: "Grossiste Central Mokolo" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: "+237677112233" })
  @IsOptional()
  @Transform(normalizePhone)
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: "Livraison les mardis. Paiement à 7 jours." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class PartnerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche par nom ou téléphone" })
  @IsOptional()
  @IsString()
  search?: string;
}
