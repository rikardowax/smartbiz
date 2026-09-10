import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { PrismaClientKnownRequestError } from "../../generated/prisma/internal/prismaNamespace.js";

/**
 * Traduit les erreurs Prisma en réponses HTTP lisibles plutôt que de laisser
 * fuiter des codes P2002/P2025 vers le client.
 */
@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter<PrismaClientKnownRequestError> {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case "P2002": {
        const target = (exception.meta?.target as string[] | undefined)?.join(", ");
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: target ? `Cette valeur existe déjà (${target})` : "Cette ressource existe déjà",
          error: "Conflict",
        });
      }
      case "P2025":
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: "Ressource introuvable",
          error: "Not Found",
        });
      case "P2003":
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Référence invalide vers une ressource liée",
          error: "Bad Request",
        });
      default:
        this.logger.error(`Erreur Prisma non gérée ${exception.code}: ${exception.message}`);
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Erreur interne du serveur",
          error: "Internal Server Error",
        });
    }
  }
}
