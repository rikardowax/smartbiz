import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";
import { StockMovementType } from "../../../generated/prisma/enums.js";

export class CreateStockMovementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    enum: StockMovementType,
    description:
      "IN : entrée · OUT : sortie · RETURN : retour client · LOSS : perte/casse · ADJUSTMENT : la quantité devient le stock cible",
  })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ example: 20, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 4600, description: "Coût unitaire d'achat (entrées)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: "Réassort hebdomadaire" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ example: "BL-2026-0148", description: "Bon de livraison, facture..." })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reference?: string;
}

export class StockMovementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
