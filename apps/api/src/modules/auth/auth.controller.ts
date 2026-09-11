import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { AuthService, type RequestContext } from "./auth.service.js";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "./dto/auth.dto.js";

@ApiTags("Authentification")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Créer un compte acheteur ou vendeur" })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, requestContext(request));
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Se connecter avec un téléphone ou un e-mail" })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, requestContext(request));
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("google")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Se connecter avec Google" })
  google(@Body() dto: GoogleLoginDto, @Req() request: Request) {
    return this.authService.googleLogin(dto, requestContext(request));
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Obtenir un nouveau jeton d'accès (rotation du refresh token)" })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, requestContext(request));
  }

  @Public()
  @Throttle({ default: { limit: 4, ttl: 300_000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Demander un code de réinitialisation par SMS" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 300_000 } })
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Définir un nouveau mot de passe à partir du code reçu" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Révoquer la session courante" })
  logout(@Body() dto: Partial<RefreshTokenDto>, @CurrentUser("id") userId: string) {
    return this.authService.logout(dto?.refreshToken, userId);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Profil de l'utilisateur connecté et ses boutiques" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @ApiBearerAuth()
  @Patch("me")
  @ApiOperation({ summary: "Mettre à jour son profil" })
  updateProfile(@CurrentUser("id") userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @ApiBearerAuth()
  @Patch("password")
  @ApiOperation({ summary: "Changer son mot de passe" })
  changePassword(@CurrentUser("id") userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }
}

function requestContext(request: Request): RequestContext {
  return {
    userAgent: request.get("user-agent") ?? undefined,
    ipAddress: request.ip,
  };
}
