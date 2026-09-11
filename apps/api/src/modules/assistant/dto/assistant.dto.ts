import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssistantChatDto {
  @ApiProperty({ example: "Quels sont mes produits en rupture ?" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: ["fr", "en"], default: "fr" })
  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;
}
