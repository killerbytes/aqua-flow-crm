process.env.IS_SEEDING = "true";

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import {
  CustomerStatus,
  EquipmentActionType,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "@/lib/definitions";

import { hashPassword } from "@/lib/auth";
import {
  Customer,
  CustomerSpecialPricing,
  EquipmentLog,
  Order,
  OrderDetail,
  ProductInventory,
  User,
  sequelize,
} from "../models";
import { CustomerFormData, ProductFormData } from "../schemas/zodSchemas";
import { markDbInitialized } from "./database";

export interface SeedProductInput {
  name: string;
  unitPrice: number;
  stockInStation: number;
  stockWithCustomers: number;
  stockDamaged?: number;
}

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
  orders: SeedOrderInput[];
}

/**
 * Helper to generate deterministically distributed seed data.
 */
export function generateSeedData(refDate: Date = new Date()): SeedDataResult {
  const products: SeedProductInput[] = [
    {
      name: "5-Gallon Container (Slim)",
      unitPrice: 35.0,
      stockInStation: 15,
      stockWithCustomers: 0,
      stockDamaged: 0,
    },
    {
      name: "5-Gallon Container (Round)",
      unitPrice: 40.0,
      stockInStation: 15,
      stockWithCustomers: 0,
      stockDamaged: 0,
    },
    {
      name: "Water Dispenser",
      unitPrice: 240.0,
      stockInStation: 5,
      stockWithCustomers: 0,
      stockDamaged: 0,
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
      phone: "+63288881234",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Elena Rostova",
      address: "789 Katipunan Ave, Loyola Heights",
      phone: "9193456789",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Golden Bay Restaurant",
      address: "12 Roxas Blvd, Pasay City",
      phone: "044285559876",
      barangayId: "034903020",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Roberto Garcia",
      address: "32 Commonwealth Ave, Fairview",
      phone: "9204567890",
      barangayId: "034903002",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Bright Minds Academy",
      address: "15 Teachers Village, Diliman",
      phone: "287774321",
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
      phone: "84443322",
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

  const orders: SeedOrderInput[] = [];
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

    const details: SeedOrderDetailInput[] = [
      {
        productId: 1,
        quantity: itemQty1,
        unitPrice: 35.0,
      },
    ];

    if (itemQty2 > 0) {
      details.push({
        productId: 2,
        quantity: itemQty2,
        unitPrice: 40.0,
      });
    }

    const totalAmount = details.reduce(
      (sum, d) => sum + d.quantity * d.unitPrice,
      0,
    );

    orders.push({
      customerId: customerId,
      totalAmount: totalAmount,
      status: statuses[i % statuses.length],
      paymentStatus: paymentStatuses[i % paymentStatuses.length],
      createdBy: 1,
      createdAt: createdAt,
      details,
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

  // await User.findOrCreate({
  //   where: { username: "cashier" },
  //   defaults: {
  //     name: "Cashier",
  //     passwordHash: adminPasswordHash,
  //     role: UserRole.CASHIER,
  //   },
  // });

  // await User.findOrCreate({
  //   where: { username: "manager" },
  //   defaults: {
  //     name: "Manager",
  //     passwordHash: adminPasswordHash,
  //     role: UserRole.MANAGER,
  //   },
  // });

  if (isTest) {
    await seedForTest(options);
  }

  console.log(
    "Database seeded successfully with 3 products, 10 customers, and 50 orders!",
  );
  markDbInitialized();
}

async function seedForTest(options: any) {
  const seedData = generateSeedData(options?.refDate);

  // Seed Products
  for (const prod of seedData.products) {
    await ProductInventory.findOrCreate({
      where: { name: prod.name },
      defaults: prod,
    });
  }

  // Seed Customers
  for (const cust of seedData.customers) {
    await Customer.findOrCreate({
      where: { phone: cust.phone },
      defaults: cust,
    });
  }

  await CustomerSpecialPricing.create({
    customerId: 1,
    productId: 1,
    discountAmount: 5.0,
  });
  await CustomerSpecialPricing.create({
    customerId: 1,
    productId: 2,
    discountAmount: 1.5,
  });

  await EquipmentLog.create({
    customerId: 1,
    productId: 1,
    actionType: EquipmentActionType.ISSUE,
    loggedBy: 1,
    quantity: 2,
  } as any);

  await EquipmentLog.create({
    customerId: 1,
    productId: 2,
    actionType: EquipmentActionType.ISSUE,
    loggedBy: 1,
    quantity: 1,
  } as any);

  await EquipmentLog.create({
    customerId: 1,
    productId: 1,
    actionType: EquipmentActionType.TEMPORARY,
    loggedBy: 1,
    quantity: 1,
  } as any);

  await EquipmentLog.create({
    customerId: 2,
    productId: 1,
    actionType: EquipmentActionType.TEMPORARY,
    loggedBy: 1,
    quantity: 1,
  } as any);

  await EquipmentLog.create({
    customerId: 3,
    productId: 1,
    actionType: EquipmentActionType.TEMPORARY,
    loggedBy: 1,
    quantity: 1,
  } as any);

  // Seed Orders and Details
  for (const ord of seedData.orders) {
    const createdOrder = await Order.create(
      {
        customerId: ord.customerId,
        totalAmount: ord.totalAmount,
        status: ord.status,
        paymentStatus: ord.paymentStatus,
        createdBy: ord.createdBy,
        createdAt: ord.createdAt,
        updatedAt: ord.createdAt,
      },
      { silent: true }, // Preserves explicit timestamps
    );

    for (const detail of ord.details) {
      await OrderDetail.create({
        orderId: createdOrder.orderId,
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        discount: detail.discount || 0,
      });
    }
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
