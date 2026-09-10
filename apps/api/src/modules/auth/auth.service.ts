import { createHash, randomInt, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type {
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
} from "../../common/types/authenticated-user.js";
import { Role } from "../../generated/prisma/enums.js";
import type { UserModel } from "../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "./dto/auth.dto.js";

const BCRYPT_ROUNDS = 12;
const RESET_CODE_TTL_MINUTES = 15;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext = {}) {
    const phone = normalizePhone(dto.phone);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
      select: { id: true, phone: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.phone === phone
          ? "Un compte existe déjà avec ce numéro de téléphone"
          : "Un compte existe déjà avec cette adresse e-mail",
      );
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        email: dto.email?.toLowerCase() ?? null,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: dto.role === Role.VENDEUR ? Role.VENDEUR : Role.ACHETEUR,
      },
    });

    const tokens = await this.issueTokens(user, context);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto, context: RequestContext = {}) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: normalizePhone(identifier) }, { email: identifier.toLowerCase() }],
      },
    });

    // Comparaison systématique même si l'utilisateur est absent, pour éviter
    // de révéler l'existence d'un compte par le temps de réponse.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException("Identifiants incorrects");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("Ce compte a été désactivé");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user, context);
    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string, context: RequestContext = {}) {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Jeton de rafraîchissement invalide ou expiré");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Un jeton déjà utilisé peut signaler un vol : on révoque toute la session.
      if (stored?.userId) await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException("Session expirée, veuillez vous reconnecter");
    }
    if (stored.userId !== payload.sub || !stored.user.isActive) {
      throw new UnauthorizedException("Session invalide");
    }

    // Rotation : l'ancien jeton est immédiatement révoqué.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user, context);
    return { user: toPublicUser(stored.user), ...tokens };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.revokeAllForUser(userId);
    }
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        shops: {
          select: { id: true, name: true, slug: true, status: true, logoUrl: true, currency: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return { ...toPublicUser(user), shops: user.shops };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        email: dto.email?.toLowerCase(),
        avatarUrl: dto.avatarUrl,
        locale: dto.locale,
      },
    });
    return toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException("Mot de passe actuel incorrect");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
    });
    await this.revokeAllForUser(userId);
    return { success: true };
  }

  /**
   * Génère un code de réinitialisation. En développement le code est journalisé ;
   * en production il faudra le transmettre via un fournisseur SMS.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const phone = normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });

    // Réponse identique dans tous les cas : on n'énumère pas les comptes.
    const genericResponse = {
      success: true,
      message: "Si ce numéro est associé à un compte, un code de vérification a été envoyé",
    };
    if (!user) return genericResponse;

    const code = randomInt(100000, 999999).toString();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000),
      },
    });

    if (this.config.get<string>("nodeEnv") !== "production") {
      this.logger.warn(`[CODE DE RÉINITIALISATION] ${phone} -> ${code}`);
    }
    // TODO: brancher un fournisseur SMS (Twilio, Orange SMS API, ...)
    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: normalizePhone(dto.phone) } });
    if (!user) throw new BadRequestException("Code invalide ou expiré");

    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(dto.code, candidate.codeHash)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) throw new BadRequestException("Code invalide ou expiré");

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true, message: "Mot de passe réinitialisé" };
  }

  private async issueTokens(user: UserModel, context: RequestContext): Promise<AuthTokens> {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessTtl = this.config.get<string>("jwt.accessTtl") ?? "15m";
    const refreshTtl = this.config.get<string>("jwt.refreshTtl") ?? "30d";

    // `expiresIn` est exprimé en secondes : on évite ainsi les formats
    // textuels dont le typage varie d'une version à l'autre de jsonwebtoken.
    const accessTtlSeconds = Math.floor(parseDuration(accessTtl) / 1000);
    const refreshTtlSeconds = Math.floor(parseDuration(refreshTtl) / 1000);

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>("jwt.accessSecret"),
      expiresIn: accessTtlSeconds,
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() } satisfies JwtRefreshPayload,
      {
        secret: this.config.getOrThrow<string>("jwt.refreshSecret"),
        expiresIn: refreshTtlSeconds,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDuration(refreshTtl)),
        userAgent: context.userAgent?.slice(0, 255),
        ipAddress: context.ipAddress,
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtlSeconds };
  }

  private async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export function toPublicUser(user: UserModel): AuthenticatedUser & {
  avatarUrl: string | null;
  locale: string;
  createdAt: Date;
} {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    createdAt: user.createdAt,
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/[\s().-]/g, "");
}

function hashToken(token: string) {
  // SHA-256 suffit ici : le jeton est une valeur aléatoire de forte entropie.
  return createHash("sha256").update(token).digest("hex");
}

/** Convertit « 15m », « 30d », « 3600 » en millisecondes. */
function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 900_000;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2] ?? "s";
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return amount * factors[unit as keyof typeof factors];
}
