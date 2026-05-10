import { SetMetadata } from "@nestjs/common";

export const RESOURCE_COMPANY_PARAM_KEY = "resource_company_param";

/**
 * Nome do campo em `req.params` ou `req.body` com o `companyId` do recurso
 * (comparado com `req.user.companyId`).
 */
export const ResourceCompanyParam = (paramName = "companyId") =>
  SetMetadata(RESOURCE_COMPANY_PARAM_KEY, paramName);
