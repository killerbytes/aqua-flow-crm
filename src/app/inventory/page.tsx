import { initDatabase } from "@/backend/db/database";
import { EquipmentLog } from "@/backend/models";
import { EquipmentService, ProductService } from "@/backend/services";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import InventoryList from "@/features/products/components/InventoryList";
import { Paginated } from "@/types";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await initDatabase();

  let products: any[] = [];
  const logsPromise: Promise<Paginated<EquipmentLog>> =
    EquipmentService.getAll();

  try {
    products = await ProductService.getAll();
  } catch (err) {
    products = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package />
            Inventory & Equipment Stock
          </h1>
          <p className="text-muted-foreground">
            Stock levels across station, customers, and damage logs.
          </p>
        </div>
      </div>

      {/* Product Stock Table */}
      <InventoryList products={products} />
      {/* Equipment Activity Logs */}
      <EquipmentLogs logsPromise={logsPromise} />
    </div>
  );
}
