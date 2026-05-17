import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MenusService } from "./menus.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = () => ({
  menu: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  menuItem: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
});

const COMPANY = "company-1";
const MENU_ID = "menu-1";
const ITEM_ID = "item-1";
const PRODUCT_ID = "product-1";

const baseMenu = {
  id: MENU_ID,
  companyId: COMPANY,
  name: "Cardápio de Verão",
  slug: "cardapio-de-verao",
  isPublic: false,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  _count: { items: 0 },
};

const baseItem = {
  id: ITEM_ID,
  menuId: MENU_ID,
  productId: PRODUCT_ID,
  companyId: COMPANY,
  isVisible: true,
  order: 0,
  product: { name: "Bolo de Chocolate", sellingPrice: "25.00" },
};

describe("MenusService", () => {
  let service: MenusService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MenusService>(MenusService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findAll", () => {
    it("should return menus filtered by companyId with itemCount", async () => {
      prisma.menu.findMany.mockResolvedValue([baseMenu]);
      const result = await service.findAll(COMPANY);
      expect(result).toHaveLength(1);
      expect(result[0].itemCount).toBe(0);
      expect(prisma.menu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: COMPANY, deletedAt: null } }),
      );
    });

    it("should return empty array when no menus exist", async () => {
      prisma.menu.findMany.mockResolvedValue([]);
      const result = await service.findAll(COMPANY);
      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return menu with items ordered by sort_order", async () => {
      prisma.menu.findFirst.mockResolvedValue({ ...baseMenu, items: [baseItem] });
      const result = await service.findOne(MENU_ID, COMPANY);
      expect(result.id).toBe(MENU_ID);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe("Bolo de Chocolate");
    });

    it("should throw NotFoundException when menu not found", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.findOne("nonexistent", COMPANY)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create menu with auto-generated slug from name", async () => {
      prisma.menu.findFirst.mockResolvedValue(null); // no slug conflict
      prisma.menu.create.mockResolvedValue(baseMenu);
      const result = await service.create({ name: "Cardápio de Verão" }, COMPANY);
      expect(result.slug).toBe("cardapio-de-verao");
      expect(prisma.menu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "cardapio-de-verao", companyId: COMPANY }),
        }),
      );
    });

    it("should use provided slug when given", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      prisma.menu.create.mockResolvedValue({ ...baseMenu, slug: "meu-cardapio" });
      await service.create({ name: "Qualquer nome", slug: "meu-cardapio" }, COMPANY);
      expect(prisma.menu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "meu-cardapio" }),
        }),
      );
    });

    it("should throw ConflictException when slug is already in use", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu); // slug conflict
      await expect(service.create({ name: "Cardápio de Verão" }, COMPANY)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.menu.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should throw NotFoundException when menu does not exist", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.update("nonexistent", { name: "Novo nome" }, COMPANY)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should update menu fields", async () => {
      prisma.menu.findFirst
        .mockResolvedValueOnce(baseMenu)  // findFirst to check exists
        .mockResolvedValueOnce(null);     // assertSlugAvailable — no conflict
      prisma.menu.update.mockResolvedValue({ ...baseMenu, name: "Novo nome", _count: { items: 0 } });
      const result = await service.update(MENU_ID, { name: "Novo nome" }, COMPANY);
      expect(result.name).toBe("Novo nome");
    });

    it("should throw ConflictException when new slug is already in use by another menu", async () => {
      prisma.menu.findFirst
        .mockResolvedValueOnce(baseMenu)                                       // menu exists (slug: "cardapio-de-verao")
        .mockResolvedValueOnce({ ...baseMenu, id: "other-menu" });             // assertSlugAvailable finds conflict
      await expect(
        service.update(MENU_ID, { slug: "cardapio-de-inverno" }, COMPANY),    // different slug → triggers check
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should soft-delete the menu by setting deletedAt", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.menu.update.mockResolvedValue({ ...baseMenu, deletedAt: new Date() });
      await service.remove(MENU_ID, COMPANY);
      expect(prisma.menu.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MENU_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it("should rename slug on soft-delete to free it for reuse", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.menu.update.mockResolvedValue({ ...baseMenu, deletedAt: new Date() });
      await service.remove(MENU_ID, COMPANY);
      const updateCall = prisma.menu.update.mock.calls[0][0];
      expect(updateCall.data.slug).toMatch(/^cardapio-de-verao__deleted__\d+$/);
    });

    it("should throw NotFoundException when menu not found", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.remove("nonexistent", COMPANY)).rejects.toThrow(NotFoundException);
    });
  });

  describe("addItem", () => {
    it("should add a product to the menu", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID, deletedAt: null });
      prisma.menuItem.findUnique.mockResolvedValue(null);
      prisma.menuItem.aggregate.mockResolvedValue({ _max: { order: null } });
      prisma.menuItem.create.mockResolvedValue(baseItem);

      const result = await service.addItem(MENU_ID, { productId: PRODUCT_ID }, COMPANY);
      expect(result.productId).toBe(PRODUCT_ID);
      expect(prisma.menuItem.create).toHaveBeenCalled();
    });

    it("should throw ConflictException when product is already in the menu", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID, deletedAt: null });
      prisma.menuItem.findUnique.mockResolvedValue(baseItem); // already exists
      await expect(
        service.addItem(MENU_ID, { productId: PRODUCT_ID }, COMPANY),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when product not found", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.addItem(MENU_ID, { productId: "bad-id" }, COMPANY),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when menu not found", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      await expect(
        service.addItem("bad-menu", { productId: PRODUCT_ID }, COMPANY),
      ).rejects.toThrow(NotFoundException);
    });

    it("should assign next order automatically", async () => {
      prisma.menu.findFirst.mockResolvedValue(baseMenu);
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      prisma.menuItem.findUnique.mockResolvedValue(null);
      prisma.menuItem.aggregate.mockResolvedValue({ _max: { order: 2 } });
      prisma.menuItem.create.mockResolvedValue({ ...baseItem, order: 3 });

      await service.addItem(MENU_ID, { productId: PRODUCT_ID }, COMPANY);
      expect(prisma.menuItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 3 }) }),
      );
    });
  });

  describe("updateItem", () => {
    it("should update item visibility and order", async () => {
      prisma.menuItem.findFirst.mockResolvedValue(baseItem);
      prisma.menuItem.update.mockResolvedValue({ ...baseItem, isVisible: false, order: 5 });
      const result = await service.updateItem(MENU_ID, ITEM_ID, { isVisible: false, order: 5 }, COMPANY);
      expect(result.isVisible).toBe(false);
      expect(result.order).toBe(5);
    });

    it("should throw NotFoundException when item not found", async () => {
      prisma.menuItem.findFirst.mockResolvedValue(null);
      await expect(
        service.updateItem(MENU_ID, "bad-item", {}, COMPANY),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeItem", () => {
    it("should delete the menu item", async () => {
      prisma.menuItem.findFirst.mockResolvedValue(baseItem);
      prisma.menuItem.delete.mockResolvedValue(baseItem);
      await service.removeItem(MENU_ID, ITEM_ID, COMPANY);
      expect(prisma.menuItem.delete).toHaveBeenCalledWith({ where: { id: ITEM_ID } });
    });

    it("should throw NotFoundException when item not found", async () => {
      prisma.menuItem.findFirst.mockResolvedValue(null);
      await expect(service.removeItem(MENU_ID, "bad-item", COMPANY)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("reorderItems", () => {
    it("should throw NotFoundException when menu not found", async () => {
      prisma.menu.findFirst.mockResolvedValue(null);
      await expect(
        service.reorderItems(MENU_ID, { items: [{ id: ITEM_ID, order: 0 }] }, COMPANY),
      ).rejects.toThrow(NotFoundException);
    });

    it("should call $transaction with an update for each item", async () => {
      prisma.menu.findFirst
        .mockResolvedValueOnce(baseMenu)
        .mockResolvedValueOnce({ ...baseMenu, items: [] });
      prisma.$transaction.mockResolvedValue([{}]);
      await service.reorderItems(
        MENU_ID,
        { items: [{ id: "i1", order: 0 }, { id: "i2", order: 1 }] },
        COMPANY,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
