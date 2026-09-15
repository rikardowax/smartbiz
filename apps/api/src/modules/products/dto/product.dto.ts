import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";

export class CreateProductDto {
  @ApiProperty({ example: "Riz parfumé 5 kg" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ description: "Référence interne du vendeur" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: "sac", default: "pièce" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: 5500, description: "Prix de vente en FCFA" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 6300, description: "Prix barré, pour afficher une promotion" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 4600, description: "Prix d'achat, sert au calcul de la marge" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 48, description: "Stock initial" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 5, description: "Seuil déclenchant l'alerte de stock" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche sur le nom, la description ou la référence" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: "Ne retourner que les produits sous le seuil d'alerte" })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({
    enum: ["recent", "price_asc", "price_desc", "name", "popular", "stock_asc"],
    default: "recent",
  })
  @IsOptional()
  @IsString()
  sort?: "recent" | "price_asc" | "price_desc" | "name" | "popular" | "stock_asc";
}

export class CatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Slug de catégorie" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Slug de boutique" })
  @IsOptional()
  @IsString()
  shop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: "Plusieurs villes, séparées par des virgules",
    example: "Douala,Yaoundé",
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((city) => city.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: "Note minimale du produit" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: "Uniquement les produits en stock" })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({
    enum: ["recent", "price_asc", "price_desc", "popular", "rating"],
    default: "recent",
  })
  @IsOptional()
  @IsString()
  sort?: "recent" | "price_asc" | "price_desc" | "popular" | "rating";
}

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
