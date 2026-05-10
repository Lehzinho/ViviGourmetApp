import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CompanyUserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthUser } from "../auth.types";

const RANK: Record<CompanyUserRole, number> = {
  [CompanyUserRole.MEMBER]: 1,
  [CompanyUserRole.ADMIN]: 2,
  [CompanyUserRole.OWNER]: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minimumRole = this.reflector.getAllAndOverride<CompanyUserRole>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minimumRole === undefined) {
      return true;
    }
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) {
      return false;
    }
    return RANK[user.role] >= RANK[minimumRole];
  }
}
