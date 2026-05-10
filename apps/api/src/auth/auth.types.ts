import { CompanyUserRole } from "@prisma/client";

export interface AuthUser {
  userId: string;
  companyId: string;
  role: CompanyUserRole;
}

export interface JwtAccessPayload {
  sub: string;
  companyId: string;
  role: CompanyUserRole;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
