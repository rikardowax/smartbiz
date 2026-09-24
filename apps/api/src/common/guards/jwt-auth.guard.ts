import { type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Auth optionnelle : sur une route publique on tente quand même
      // passport pour peupler req.user quand un token valide est présent
      // (ex. checkout connecté vs invité). Un token absent/invalide
      // ne bloque jamais l'accès.
      return Promise.resolve(super.canActivate(context))
        .then(() => true)
        .catch(() => true);
    }
    return super.canActivate(context);
  }
}
