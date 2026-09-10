import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "../../../generated/prisma/enums.js";

const normalizePhone = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/[\s().-]/g, "") : value;

export class CheckoutItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CheckoutDto {
  @ApiProperty({
    type: [CheckoutItemDto],
    description: "Le panier peut mélanger plusieurs boutiques",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ example: "Marie Fotso" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ example: "+237699000003" })
  @Transform(normalizePhone)
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  contactPhone: string;

  @ApiProperty({ example: "Yaoundé" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  deliveryCity: string;

  @ApiProperty({ example: "Quartier Bastos, rue 1.234" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  deliveryLine1: string;

  @ApiPropertyOptional({ example: "Appeler avant de livrer" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

/** Vente saisie directement par le vendeur (comptoir, téléphone, WhatsApp). */
export class CreateManualOrderDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ example: "Jeanne Atangana" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ example: "+237655334455" })
  @Transform(normalizePhone)
  @Matches(/^\+?[0-9]{8,15}$/, { message: "Numéro de téléphone invalide" })
  contactPhone: string;

  @ApiPropertyOptional({ enum: SalesChannel, default: SalesChannel.IN_STORE })
  @IsOptional()
  @IsEnum(SalesChannel)
  channel?: SalesChannel;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PAID })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deliveryCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryLine1?: string;

  @ApiPropertyOptional({ example: 0, description: "Frais de livraison en FCFA" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 500, description: "Remise accordée en FCFA" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discount?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: "Colis remis au livreur Express Yaoundé" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: SalesChannel })
  @IsOptional()
  @IsEnum(SalesChannel)
  channel?: SalesChannel;

  @ApiPropertyOptional({ description: "Numéro de commande, nom ou téléphone du client" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class TrackOrderDto {
  @ApiProperty({ example: "SB-260910-4821" })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ example: "+237699000003", description: "Numéro utilisé lors de la commande" })
  @Transform(normalizePhone)
  @IsString()
  @IsNotEmpty()
  phone: string;
}
