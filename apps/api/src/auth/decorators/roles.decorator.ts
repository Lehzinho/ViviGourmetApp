import { SetMetadata } from "@nestjs/common";
import { CompanyUserRole } from "@prisma/client";

/** Role mínima necessária (hierarquia: MEMBER < ADMIN < OWNER). */
export const ROLES_KEY = "auth_minimum_role";

export const Roles = (minimumRole: CompanyUserRole) => SetMetadata(ROLES_KEY, minimumRole);
