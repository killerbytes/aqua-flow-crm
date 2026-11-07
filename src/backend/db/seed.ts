process.env.IS_SEEDING = "true";

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import {
  CustomerStatus,
  EquipmentActionType,
  InventoryAdjustmentType,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "@/lib/definitions";

import { hashPassword } from "@/lib/auth";
import { User, sequelize } from "../models";
import {
  CustomerFormData,
  OrderFormData,
  OrderItemsFormData,
  ProductFormData,
} from "../schemas/zodSchemas";
import {
  CustomerService,
  EquipmentService,
  OrderService,
  ProductService,
} from "../services";
import { InventoryService } from "../services/inventory.service";
import { markDbInitialized } from "./database";

export interface SeedOrderDetailInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface SeedOrderInput {
  customerId: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdBy: number;
  createdAt: Date;
  details: SeedOrderDetailInput[];
}

export interface SeedDataResult {
  products: ProductFormData[];
  customers: CustomerFormData[];
  orders: OrderFormData[];
}

/**
 * Helper to generate deterministically distributed seed data.
 */
export function generateSeedData(refDate: Date = new Date()): SeedDataResult {
  const products: ProductFormData[] = [
    {
      name: "5-Gallon Container (Slim)",
      unitPrice: 35.0,
    },
    {
      name: "5-Gallon Container (Round)",
      unitPrice: 40.0,
    },
    {
      name: "Water Dispenser",
      unitPrice: 240.0,
      isLendOnly: true,
    },
  ];

  const customers: CustomerFormData[] = [
    {
      name: "Maria Santos",
      address: "123 Sampaguita St, Quezon City",
      phone: "+639171234567",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
      notes: "09184000368",
    },
    {
      name: "Juan Dela Cruz",
      address: "456 Mayon Ave, Quezon City",
      phone: "09182345678",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
      notes: "test",
    },
    {
      name: "Apex Tech Solutions Inc.",
      address: "Suite 801, Eastwood City, Libis",
      phone: "09168888123",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Elena Rostova",
      address: "789 Katipunan Ave, Loyola Heights",
      phone: "+639193456789",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Golden Bay Restaurant",
      address: "12 Roxas Blvd, Pasay City",
      phone: "09165554444",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Roberto Garcia",
      address: "32 Commonwealth Ave, Fairview",
      phone: "09204567890",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Bright Minds Academy",
      address: "15 Teachers Village, Diliman",
      phone: "09217774321",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Ana Lim",
      address: "88 Timog Ave, South Triangle",
      phone: "09215678901",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "St. Jude Clinic",
      address: "54 Banawe St, Sta. Mesa Heights",
      phone: "09174443322",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Carlos Reyes",
      address: "21 E. Rodriguez Sr. Ave, New Manila",
      phone: "09226789012",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
  ];

  const orders: (OrderFormData & { createdAt?: Date })[] = [];
  const statuses = [
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ];
  const paymentStatuses = [
    PaymentStatus.PAID,
    PaymentStatus.PAID,
    PaymentStatus.PAID,
    PaymentStatus.UNPAID,
  ];

  for (let i = 0; i < 50; i++) {
    const customerId = (i % customers.length) + 1;
    const daysAgo = Math.floor((i / 50) * 30);
    const createdAt = new Date(refDate);
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const isCommercial =
      customerId === 3 ||
      customerId === 5 ||
      customerId === 7 ||
      customerId === 9;
    const itemQty1 = isCommercial ? 10 + (i % 15) : 1 + (i % 4);
    const itemQty2 = i % 3 === 0 ? (isCommercial ? 5 : 1) : 0;

    const details: OrderItemsFormData = [
      {
        productId: 1,
        quantity: itemQty1,
        unitPrice: 35.0,
        discount: 0,
      },
    ];

    if (itemQty2 > 0) {
      details.push({
        productId: 2,
        quantity: itemQty2,
        unitPrice: 40.0,
        discount: 0,
      });
    }

    orders.push({
      customerId: customerId,
      status: statuses[i % statuses.length],
      paymentStatus: paymentStatuses[i % paymentStatuses.length],
      items: details,
      createdAt,
    });
  }

  return { products, customers, orders };
}

/**
 * Seeds the database with products, customers, and 50 orders spanning 1 month.
 */
export async function seedDatabase(options?: {
  isTest?: boolean;
  force?: boolean;
  refDate?: Date;
}) {
  process.env.IS_SEEDING = "true";
  const shouldForce = options?.force ?? true;
  const isTest =
    options?.isTest ||
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true";

  if (isTest || shouldForce) {
    if (!isTest && sequelize.getDialect() === "postgres") {
      try {
        await sequelize.query(
          "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
        );
      } catch (dropErr) {
        console.warn("PostgreSQL schema drop fallback warning:", dropErr);
      }
    }
    await sequelize.sync({ force: true });
  } else {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
  }

  const adminPasswordHash = await hashPassword("pass");

  // Ensure default admin user exists
  await User.findOrCreate({
    where: { username: "admin" },
    defaults: {
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  await User.findOrCreate({
    where: { username: "cashier" },
    defaults: {
      name: "Cashier",
      passwordHash: adminPasswordHash,
      role: UserRole.CASHIER,
    },
  });

  await User.findOrCreate({
    where: { username: "manager" },
    defaults: {
      name: "Manager",
      passwordHash: adminPasswordHash,
      role: UserRole.MANAGER,
    },
  });

  if (isTest) {
  }
  await seedForTest(options);

  console.log(
    "Database seeded successfully with 3 products, 10 customers, and 50 orders!",
  );
  markDbInitialized();
}

async function seedForTest(options: any) {
  const seedData = generateSeedData(options?.refDate);

  // Seed Products
  for (const prod of seedData.products) {
    await ProductService.create(prod);
  }

  // Seed Customers
  for (const cust of seedData.customers) {
    await CustomerService.create(cust);
  }

  await InventoryService.createAdjustment({
    productId: 1,
    adjustmentType: InventoryAdjustmentType.STOCK_IN,
    quantity: 10,
    reason: "Initial stock",
  }, 1);
  await InventoryService.createAdjustment({
    productId: 2,
    adjustmentType: InventoryAdjustmentType.STOCK_IN,
    quantity: 10,
    reason: "Initial stock",
  }, 1);
  await InventoryService.createAdjustment({
    productId: 3,
    adjustmentType: InventoryAdjustmentType.STOCK_IN,
    quantity: 10,
    reason: "Initial stock",
  }, 1);

  await CustomerService.setSpecialPricing({
    customerId: 1,
    productId: 1,
    discountAmount: 5.0,
  });
  await CustomerService.setSpecialPricing({
    customerId: 1,
    productId: 2,
    discountAmount: 1.5,
  });

  await EquipmentService.logEquipment(
    {
      customerId: 1,
      productId: 1,
      actionType: EquipmentActionType.ISSUE,
      quantity: 1,
    },
    1,
  );

  await EquipmentService.logEquipment(
    {
      customerId: 1,
      productId: 1,
      actionType: EquipmentActionType.TEMPORARY,
      quantity: 1,
    },
    1,
  );

  await InventoryService.createAdjustment({
    productId: 1,
    adjustmentType: InventoryAdjustmentType.DECLARED_LOST,
    quantity: 1,
    reason: "lost in space",
  }, 1);

  await EquipmentService.logEquipment(
    {
      customerId: 1,
      productId: 1,
      actionType: EquipmentActionType.TEMPORARY_RETURNED,
      quantity: 1,
    },
    1,
  );

  await EquipmentService.logEquipment(
    {
      customerId: 1,
      productId: 1,
      actionType: EquipmentActionType.DAMAGED,
      quantity: 1,
    },
    1,
  );

  // await EquipmentService.logEquipment(
  //   {
  //     customerId: 1,
  //     productId: 1,
  //     actionType: EquipmentActionType.TEMPORARY,
  //     quantity: 1,
  //   },
  //   1,
  // );

  // await EquipmentService.logEquipment(
  //   {
  //     customerId: 2,
  //     productId: 1,
  //     actionType: EquipmentActionType.TEMPORARY,
  //     quantity: 1,
  //   },
  //   1,
  // );

  // await EquipmentService.logEquipment(
  //   {
  //     customerId: 3,
  //     productId: 1,
  //     actionType: EquipmentActionType.TEMPORARY,
  //     quantity: 1,
  //   },
  //   1,
  // );

  // Seed Orders and Details
  for (const ord of seedData.orders) {
    const createdOrder = await OrderService.create(ord, 1);
  }
}
// Execution block when invoked directly via CLI (e.g. `npx tsx src/backend/db/seed.ts`)
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
