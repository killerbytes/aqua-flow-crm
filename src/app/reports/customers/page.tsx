import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import LastOrderList from "@/features/reports/LastOrderList";
import { PAGINATION } from "@/lib/definitions";
import { Users } from "lucide-react";

interface SearchParams {
  page?: string;
  limit?: string;
  productId?: string;
  customerId?: string;
  days?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

interface CustomersPageProps {
  searchParams?: Promise<SearchParams>;
}

const parseNumber = (val?: string) =>
  val !== undefined && val !== "" && !isNaN(Number(val)) ? Number(val) : undefined;

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  await initDatabase();

  const params = await searchParams;
  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;

  const customers = await ReportService.getCustomersWithLastOrder({
    page,
    limit,
    order: params?.order,
    sort: params?.sort,
    query: {
      productId: parseNumber(params?.productId),
      customerId: parseNumber(params?.customerId),
      days: parseNumber(params?.days),
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
