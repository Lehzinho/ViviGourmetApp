import { createHash, randomBytes } from "crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CompanyUserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtAccessPayload } from "./auth.types";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

const BCRYPT_ROUNDS = 12;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<
    AuthTokensResponse & {
      user: { id: string; email: string; name: string };
      company: { id: string; name: string; slug: string };
    }
  > {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const slug = await this.uniqueCompanySlug(slugify(dto.companyName));
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_MS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
      });
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          slug,
        },
      });
      await tx.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: CompanyUserRole.OWNER,
        },
      });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          companyId: company.id,
          tokenHash,
          expiresAt,
        },
      });
      return { user, company };
    });

    const accessToken = this.signAccessToken({
      sub: result.user.id,
      companyId: result.company.id,
      role: CompanyUserRole.OWNER,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
      },
    };
  }

  async login(dto: LoginDto): Promise<
    AuthTokensResponse & {
      user: { id: string; email: string; name: string };
      company: { id: string; name: string; slug: string };
      role: CompanyUserRole;
    }
  > {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const membership = await this.resolveMembership(user.id, dto.companyId);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        companyId: membership.companyId,
        tokenHash,
        expiresAt,
      },
    });

    const accessToken = this.signAccessToken({
      sub: user.id,
      companyId: membership.companyId,
      role: membership.role,
    });

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: membership.companyId },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      company: { id: company.id, name: company.name, slug: company.slug },
      role: membership.role,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.revokedAt || record.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const membership = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId: record.userId, companyId: record.companyId },
      },
      include: {
        user: true,
        company: true,
      },
    });
    if (
      !membership ||
      membership.user.deletedAt ||
      membership.company.deletedAt
    ) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const accessToken = this.signAccessToken({
      sub: record.userId,
      companyId: record.companyId,
      role: membership.role,
    });
    return { accessToken };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private signAccessToken(payload: JwtAccessPayload): string {
    return this.jwtService.sign({
      sub: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
    } satisfies JwtAccessPayload);
  }

  private async resolveMembership(
    userId: string,
    companyIdInput?: string,
  ): Promise<{ companyId: string; role: CompanyUserRole; }> {
    const memberships = await this.prisma.companyUser.findMany({
      where: {
        userId,
        user: { deletedAt: null },
        company: { deletedAt: null },
      },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException("No active company membership");
    }

    if (memberships.length === 1) {
      const only = memberships[0];
      if (companyIdInput && companyIdInput !== only.companyId) {
        throw new UnauthorizedException("Invalid company for this user");
      }
      return { companyId: only.companyId, role: only.role };
    }

    if (!companyIdInput) {
      throw new BadRequestException("companyId is required for this account");
    }

    const match = memberships.find((m) => m.companyId === companyIdInput);
    if (!match) {
      throw new UnauthorizedException("Not a member of this company");
    }
    return { companyId: match.companyId, role: match.role };
  }

  private async uniqueCompanySlug(base: string): Promise<string> {
    let candidate = base;
    for (let i = 0; i < 50; i++) {
      const exists = await this.prisma.company.findUnique({ where: { slug: candidate } });
      if (!exists) return candidate;
      candidate = `${base}-${randomBytes(3).toString("hex")}`;
    }
    throw new ConflictException("Could not allocate company slug");
  }
}
