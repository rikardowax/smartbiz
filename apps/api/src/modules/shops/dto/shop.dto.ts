import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";
import { ShopStatus } from "../../../generated/prisma/enums.js";

export class CreateShopDto {
  @ApiProperty({ example: "Alimentation Chez Awa" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: "Boutique de quartier, livraison sous 24 h à Yaoundé." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: "+237699000001" })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/[\s().-]/g, "") : value))
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  phone: string;

  @ApiPropertyOptional({ example: "+237699000001", description: "Numéro utilisé par le SalesBot" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/[\s().-]/g, "") : value))
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro WhatsApp invalide" })
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: "Yaoundé" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @ApiPropertyOptional({ example: "Cameroun" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: "Marché Mokolo, hangar 12" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @ApiPropertyOptional({ example: ["Alimentation", "Électronique"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  interests?: string[];
}

export class UpdateShopDto extends PartialType(CreateShopDto) {}

export class UpdateShopStatusDto {
  @ApiProperty({ enum: ShopStatus })
  @IsEnum(ShopStatus)
  status: ShopStatus;
}

export class ShopSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche par nom ou ville" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;
}
