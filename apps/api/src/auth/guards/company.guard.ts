import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "../auth.types";
import { RESOURCE_COMPANY_PARAM_KEY } from "../decorators/resource-company-param.decorator";

@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const paramName = this.reflector.getAllAndOverride<string>(RESOURCE_COMPANY_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!paramName) {
      throw new InternalServerErrorException(
        "CompanyGuard requires @ResourceCompanyParam() on the route",
      );
    }
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params: Record<string, string>;
      body?: Record<string, unknown>;
    }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }
    const fromParams = request.params?.[paramName];
    const fromBody = request.body?.[paramName] as string | undefined;
    const resourceCompanyId = fromParams ?? fromBody;
    if (!resourceCompanyId) {
      throw new BadRequestException(`Missing ${paramName} for company scope`);
    }
    if (resourceCompanyId !== user.companyId) {
      throw new ForbiddenException("Resource belongs to another company");
    }
    return true;
  }
}
