import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import { CustomersService } from "./customers.service.js";
import {
  CreateCustomerDto,
  CreateSupplierDto,
  PartnerQueryDto,
  UpdateCustomerDto,
  UpdateSupplierDto,
} from "./dto/partner.dto.js";
import { SuppliersService } from "./suppliers.service.js";

@ApiTags("Clients (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Ajouter un client au fichier de la boutique" })
  create(@Param("shopId") shopId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les clients, les plus gros acheteurs d'abord" })
  findAll(@Param("shopId") shopId: string, @Query() query: PartnerQueryDto) {
    return this.customersService.findAll(shopId, query);
  }

  @Get(":customerId")
  @ApiOperation({ summary: "Fiche client avec son historique de commandes" })
  findOne(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.findOne(shopId, customerId);
  }

  @Patch(":customerId")
  @ApiOperation({ summary: "Modifier une fiche client" })
  update(
    @Param("shopId") shopId: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(shopId, customerId, dto);
  }

  @Delete(":customerId")
  @ApiOperation({ summary: "Supprimer une fiche client" })
  remove(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.remove(shopId, customerId);
  }
}

@ApiTags("Fournisseurs (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: "Ajouter un fournisseur" })
  create(@Param("shopId") shopId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les fournisseurs" })
  findAll(@Param("shopId") shopId: string, @Query() query: PartnerQueryDto) {
    return this.suppliersService.findAll(shopId, query);
  }

  @Get(":supplierId")
  @ApiOperation({ summary: "Fiche fournisseur avec ses approvisionnements" })
  findOne(@Param("shopId") shopId: string, @Param("supplierId") supplierId: string) {
    return this.suppliersService.findOne(shopId, supplierId);
  }

  @Patch(":supplierId")
  @ApiOperation({ summary: "Modifier un fournisseur" })
  update(
    @Param("shopId") shopId: string,
    @Param("supplierId") supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(shopId, supplierId, dto);
  }

  @Delete(":supplierId")
  @ApiOperation({ summary: "Supprimer un fournisseur" })
  remove(@Param("shopId") shopId: string, @Param("supplierId") supplierId: string) {
    return this.suppliersService.remove(shopId, supplierId);
  }
}
