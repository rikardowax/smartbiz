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
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from "./dto/finance.dto.js";
import { FinanceService } from "./finance.service.js";

@ApiTags("Finances (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post("transactions")
  @ApiOperation({ summary: "Enregistrer une recette ou une dépense" })
  create(@Param("shopId") shopId: string, @Body() dto: CreateTransactionDto) {
    return this.financeService.create(shopId, dto);
  }

  @Get("transactions")
  @ApiOperation({ summary: "Journal des recettes et dépenses" })
  findAll(@Param("shopId") shopId: string, @Query() query: TransactionQueryDto) {
    return this.financeService.findAll(shopId, query);
  }

  @Get("summary")
  @ApiOperation({ summary: "Synthèse financière : totaux, catégories, évolution mensuelle" })
  summary(@Param("shopId") shopId: string, @Query() query: TransactionQueryDto) {
    return this.financeService.summary(shopId, query);
  }

  @Patch("transactions/:transactionId")
  @ApiOperation({ summary: "Modifier une écriture" })
  update(
    @Param("shopId") shopId: string,
    @Param("transactionId") transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.financeService.update(shopId, transactionId, dto);
  }

  @Delete("transactions/:transactionId")
  @ApiOperation({ summary: "Supprimer une écriture" })
  remove(@Param("shopId") shopId: string, @Param("transactionId") transactionId: string) {
    return this.financeService.remove(shopId, transactionId);
  }
}
