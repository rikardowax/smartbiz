import "dotenv/config";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useBodyParser("json", { limit: "8mb" });
  app.useBodyParser("urlencoded", { limit: "8mb", extended: true });
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  const prefix = config.get<string>("apiPrefix") ?? "api/v1";
  const port = config.get<number>("port") ?? 3000;
  const corsOrigins = config.get<string[]>("corsOrigins") ?? [];

  app.setGlobalPrefix(prefix);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SmartBiz API")
    .setDescription(
      "API de la plateforme SmartBiz : marketplace, ERP simplifié et agents IA pour les commerçants.",
    )
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();

  SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig), {
    jsonDocumentUrl: `${prefix}/openapi.json`,
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, "0.0.0.0");
  logger.log(`SmartBiz API démarrée sur http://localhost:${port}/${prefix}`);
  logger.log(`Documentation Swagger : http://localhost:${port}/${prefix}/docs`);
}

await bootstrap();
