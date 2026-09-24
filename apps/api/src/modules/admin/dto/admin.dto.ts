import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";
import { ProductStatus, Role, ShopStatus } from "../../../generated/prisma/enums.js";

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche par nom, téléphone ou e-mail" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * Volontairement typé en chaîne : `enableImplicitConversion` réduit une
   * query string à `!!value`, ce qui transformerait « false » en `true`.
   * La conversion se fait dans `activeFilter`.
   */
  @ApiPropertyOptional({ enum: ["true", "false"], description: "Comptes actifs ou désactivés" })
  @IsOptional()
  @IsIn(["true", "false"])
  isActive?: "true" | "false";

  get activeFilter(): boolean | undefined {
    return this.isActive === undefined ? undefined : this.isActive === "true";
  }
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /** Booléen JSON attendu : le corps de requête n'est pas une query string. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche par nom de produit" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Restreindre à une boutique" })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class AdminShopQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche par nom ou ville" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ShopStatus })
  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;
}
