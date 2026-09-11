import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

class WhatsAppTextMessageDto {
  @IsString()
  body!: string;
}

class WhatsAppProfileDto {
  @IsString()
  name!: string;
}

class WhatsAppMessageDto {
  @IsString()
  from!: string;

  @IsString()
  id!: string;

  @IsString()
  timestamp!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppTextMessageDto)
  text?: WhatsAppTextMessageDto;
}

class WhatsAppContactDto {
  @IsString()
  wa_id!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppProfileDto)
  profile?: WhatsAppProfileDto;
}

class WhatsAppMetadataDto {
  @IsString()
  display_phone_number!: string;

  @IsString()
  phone_number_id!: string;
}

class WhatsAppValueDto {
  @IsString()
  messaging_product!: string;

  @ValidateNested()
  @Type(() => WhatsAppMetadataDto)
  metadata!: WhatsAppMetadataDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppContactDto)
  contacts?: WhatsAppContactDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppMessageDto)
  messages?: WhatsAppMessageDto[];
}

class WhatsAppChangeDto {
  @IsString()
  field!: string;

  @ValidateNested()
  @Type(() => WhatsAppValueDto)
  value!: WhatsAppValueDto;
}

class WhatsAppEntryDto {
  @IsString()
  id!: string;

  @ValidateNested({ each: true })
  @Type(() => WhatsAppChangeDto)
  changes!: WhatsAppChangeDto[];
}

export class WhatsAppWebhookDto {
  @IsString()
  object!: string;

  @ValidateNested({ each: true })
  @Type(() => WhatsAppEntryDto)
  entry!: WhatsAppEntryDto[];
}
