import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator.js";
import { PrismaService } from "./prisma/prisma.service.js";

@ApiTags("Système")
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Sonde de santé (utilisée par Render)" })
  async health() {
    let database = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      service: "smartbiz-api",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
