import { requirePageUser } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import {
  CustomersWithLastOrderParams,
  ReportService,
} from "@/backend/services";
import LastOrderList from "@/features/reports/LastOrderList";
import { PAGINATION } from "@/lib/definitions";
import { Users } from "lucide-react";

interface CustomersPageProps {
  searchParams?: Promise<CustomersWithLastOrderParams>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  await initDatabase();
  await requirePageUser();

  const params = await searchParams;
  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const productId = params?.query?.productId
    ? Number(params.query.productId)
    : (params as any)?.productId
      ? Number((params as any).productId)
      : undefined;
  const customerId = params?.query?.customerId
    ? Number(params.query.customerId)
    : (params as any)?.customerId
      ? Number((params as any).customerId)
      : undefined;
  const days =
    params?.query?.days !== undefined
      ? Number(params.query.days)
      : (params as any)?.days !== undefined && (params as any)?.days !== ""
        ? Number((params as any).days)
        : undefined;
  const order = params?.order;
  const sort = params?.sort;

  const customers = await ReportService.getCustomersWithLastOrder({
    page,
    limit,
    order,
    sort,
    query: {
      productId,
      customerId,
      days,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Customer Management
          </h1>
          <p className="text-muted-foreground">
            Manage your client base, view balance histories, and monitor
            temporary loan status.
          </p>
        </div>
      </div>
      <LastOrderList customers={customers} />
    </div>
  );
}
