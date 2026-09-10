import { plainToInstance } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsIn(["development", "test", "production"])
  NODE_ENV: string = "development";

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(16, { message: "JWT_ACCESS_SECRET doit contenir au moins 16 caractères" })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(16, { message: "JWT_REFRESH_SECRET doit contenir au moins 16 caractères" })
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsString()
  WEB_APP_URL?: string;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_MODEL?: string;
}

/**
 * Valide les variables d'environnement au démarrage : mieux vaut échouer
 * immédiatement qu'à la première requête.
 */
export function validateEnv(raw: Record<string, unknown>) {
  const config = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(config, { skipMissingProperties: false, whitelist: false });
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(", "))
      .join("\n  - ");
    throw new Error(`Configuration d'environnement invalide :\n  - ${details}`);
  }

  return raw;
}

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: Number.parseInt(process.env.PORT ?? "3000", 10),
    apiPrefix: process.env.API_PREFIX ?? "api/v1",
    webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:3001",
    corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3001")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    database: {
      url: process.env.DATABASE_URL as string,
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
      refreshSecret: process.env.JWT_REFRESH_SECRET as string,
      refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    },
  };
};

export type AppConfig = ReturnType<typeof configuration>;
