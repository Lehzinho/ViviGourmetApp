import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { CompanyUserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock };
    company: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    companyUser: { findMany: jest.Mock; findUnique: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtSign: jest.Mock;

  beforeEach(async () => {
    jwtSign = jest.fn().mockReturnValue("signed-access-token");
    prisma = {
      user: { findUnique: jest.fn() },
      company: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      companyUser: { findMany: jest.fn(), findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("creates user, company, OWNER membership, refresh row and returns tokens", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          user: {
            create: jest.fn().mockResolvedValue({
              id: "user-1",
              email: "a@b.com",
              name: "Alice",
            }),
          },
          company: {
            create: jest.fn().mockResolvedValue({
              id: "co-1",
              name: "Acme",
              slug: "acme",
            }),
          },
          companyUser: { create: jest.fn().mockResolvedValue({}) },
          refreshToken: { create: jest.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.register({
        email: "a@b.com",
        password: "password12",
        name: "Alice",
        companyName: "Acme",
      });

      expect(result.accessToken).toBe("signed-access-token");
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe("user-1");
      expect(result.company.slug).toBe("acme");
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "user-1",
          companyId: "co-1",
          role: CompanyUserRole.OWNER,
        }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("password12", expect.any(Number));
    });

    it("throws ConflictException when email exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.register({
          email: "a@b.com",
          password: "password12",
          name: "A",
          companyName: "Co",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const userRow = {
      id: "user-1",
      email: "a@b.com",
      passwordHash: "hashed",
      name: "Alice",
      deletedAt: null,
    };

    it("returns tokens for single membership", async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.companyUser.findMany.mockResolvedValue([
        { companyId: "co-1", role: CompanyUserRole.MEMBER },
      ]);
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.company.findUniqueOrThrow.mockResolvedValue({
        id: "co-1",
        name: "Acme",
        slug: "acme",
      });

      const res = await service.login({
        email: "a@b.com",
        password: "password12",
      });

      expect(res.accessToken).toBe("signed-access-token");
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "user-1",
          companyId: "co-1",
          role: CompanyUserRole.MEMBER,
        }),
      );
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it("throws when password invalid", async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ email: "a@b.com", password: "wrong" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws BadRequest when multiple memberships and companyId omitted", async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.companyUser.findMany.mockResolvedValue([
        { companyId: "c1", role: CompanyUserRole.MEMBER },
        { companyId: "c2", role: CompanyUserRole.MEMBER },
      ]);

      await expect(
        service.login({ email: "a@b.com", password: "password12" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws when single membership but companyId does not match", async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.companyUser.findMany.mockResolvedValue([
        { companyId: "co-1", role: CompanyUserRole.ADMIN },
      ]);

      await expect(
        service.login({
          email: "a@b.com",
          password: "password12",
          companyId: "other-co",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("returns new access token when refresh is valid", async () => {
      const future = new Date(Date.now() + 60_000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: "u1",
        companyId: "c1",
        revokedAt: null,
        expiresAt: future,
      });
      prisma.companyUser.findUnique.mockResolvedValue({
        role: CompanyUserRole.ADMIN,
        user: { deletedAt: null },
        company: { deletedAt: null },
      });

      const res = await service.refresh("some-refresh-token");

      expect(res.accessToken).toBe("signed-access-token");
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "u1",
          companyId: "c1",
          role: CompanyUserRole.ADMIN,
        }),
      );
    });

    it("throws when token expired", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: "u1",
        companyId: "c1",
        revokedAt: null,
        expiresAt: new Date(0),
      });

      await expect(service.refresh("t")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws when token revoked", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: "u1",
        companyId: "c1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh("t")).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("marks refresh token as revoked", async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout("refresh-token");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
