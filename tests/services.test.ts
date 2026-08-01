import { describe, it, expect, beforeAll } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { AuthService } from "../src/backend/services/auth.service";
import { CustomerService } from "../src/backend/services/customer.service";
import { OrderService } from "../src/backend/services/order.service";
import { ProductService } from "../src/backend/services/product.service";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { ReportService } from "../src/backend/services/report.service";

describe("Domain Services Unit & Integration Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  describe("AuthService", () => {
    it("should login user with valid credentials and return camelCase DTO", async () => {
      const result = await AuthService.login("admin@test.com", "pass");
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("admin@test.com");
      expect(result.user.userId).toBeDefined();
    });

    it("should throw error on invalid login", async () => {
      await expect(AuthService.login("admin@test.com", "wrongpass")).rejects.toThrow("Invalid email or password");
    });

    it("should fetch me user by ID", async () => {
      const user = await AuthService.me(1);
      expect(user).toBeDefined();
      expect(user?.userId).toBe(1);
    });

    it("should list users", async () => {
      const users = await AuthService.getUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users[0].userId).toBeDefined();
    });
  });

  describe("CustomerService", () => {
    it("should list customers with pagination and query filter returning camelCase POJOs", async () => {
      const result = await CustomerService.getCustomers({ limit: 5, page: 1, query: { term: "" } });
      expect(result.rows).toBeDefined();
      expect(result.pagination.currentPage).toBe(1);
      expect(result.rows[0].customerId).toBeDefined();
      expect(result.rows[0].customerType).toBeDefined();
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it("should get single customer by ID", async () => {
      const customer = await CustomerService.getCustomerById(1);
      expect(customer).toBeDefined();
      expect(customer?.customerId).toBe(1);
    });

    it("should create, update, and delete customer", async () => {
      const created = await CustomerService.createCustomer({
        name: "Test Customer",
        address: "123 Test St",
        phone: "09123456789",
        customerType: "RESIDENTIAL",
      });
      expect(created.customerId).toBeDefined();

      const updated = await CustomerService.updateCustomer(created.customerId, { name: "Updated Customer" });
      expect(updated.name).toBe("Updated Customer");

      const deleted = await CustomerService.deleteCustomer(created.customerId);
      expect(deleted).toBe(true);
    });
  });

  describe("ProductService", () => {
    it("should list products and fetch single product with camelCase DTOs", async () => {
      const products = await ProductService.getProducts();
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].productId).toBeDefined();

      const product = await ProductService.getProductById(products[0].productId);
      expect(product).toBeDefined();
      expect(product?.productId).toBe(products[0].productId);
    });

    it("should create and update a product", async () => {
      const created = await ProductService.createProduct({
        name: "New Product Gallon",
        stockInStation: 50,
        unitPrice: 35.0,
      });
      expect(created.productId).toBeDefined();

      const updated = await ProductService.updateProduct(created.productId, { unitPrice: 40.0 });
      expect(updated.unitPrice).toBe(40.0);
    });
  });

  describe("OrderService", () => {
    it("should list orders with and without customerId filter returning camelCase DTOs", async () => {
      const allOrdersResult = await OrderService.getOrders({ limit: 10, page: 1, query: {} });
      expect(allOrdersResult.rows.length).toBeGreaterThan(0);
      expect(allOrdersResult.rows[0].orderId).toBeDefined();

      const customerOrdersResult = await OrderService.getOrders({ query: { customerId: 1 } });
      expect(customerOrdersResult.rows.length).toBeGreaterThan(0);
      expect(customerOrdersResult.rows.every((o) => o.customerId === 1)).toBe(true);

      const created = await OrderService.createOrder(
        {
          customerId: 1,
          status: "PENDING",
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1
      );

      expect(created.orderId).toBeDefined();
      expect(created.orderDetails[0].discount).toBe(5.0);
      expect(created.totalAmount).toBe(90.0);

      const updated = await OrderService.updateOrderStatus(created.orderId, "COMPLETED");
      expect(updated.status).toBe("COMPLETED");

      const deleted = await OrderService.deleteOrder(created.orderId);
      expect(deleted).toBe(true);
    });
  });

  describe("EquipmentService", () => {
    it("should log equipment and query logs returning camelCase DTOs", async () => {
      const log = await EquipmentService.logEquipment(
        {
          customerId: 1,
          productId: 1,
          actionType: "ISSUE",
          quantity: 2,
          notes: "Issued 2 slim containers",
        },
        1
      );

      expect(log.logId).toBeDefined();

      const logs = await EquipmentService.getEquipmentLogs({ query: { customerId: 1 } });
      expect(logs.rows.length).toBeGreaterThan(0);
      expect(logs.rows[0].logId).toBeDefined();
    });
  });

  describe("ReportService", () => {
    it("should calculate daily sales and weekly churn", async () => {
      const sales = await ReportService.getDailySales("2026-07-30");
      expect(sales.date).toBe("2026-07-30");
      expect(typeof sales.totalSales).toBe("number");

      const churn = await ReportService.getWeeklyChurn();
      expect(churn.timeframe).toBe("7_days");
      expect(Array.isArray(churn.customers)).toBe(true);
    });
  });
});
