import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Public } from "../../common/decorators/public.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { slugify } from "../../common/utils/slug.util.js";
import { ProductStatus, Role } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";

export class UpsertCategoryDto {
  @ApiProperty({ example: "Alimentation" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: "wheat", description: "Nom d'icône lucide" })
  @IsOptional()
  @IsString()
  iconName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

@ApiTags("Catégories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Arborescence des catégories avec le nombre de produits en vente" })
  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { products: { where: { status: ProductStatus.ACTIVE } } } },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    }));
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: "Créer une catégorie (administration)" })
  create(@Body() dto: UpsertCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, slug: slugify(dto.name) } });
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(":id")
  @ApiOperation({ summary: "Modifier une catégorie (administration)" })
  update(@Param("id") id: string, @Body() dto: UpsertCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: { ...dto, slug: slugify(dto.name) },
    });
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(":id")
  @ApiOperation({ summary: "Supprimer une catégorie (administration)" })
  async remove(@Param("id") id: string) {
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
