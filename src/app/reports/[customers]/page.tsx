import { initDatabase } from "@/backend/db/database";
import { CommonService } from "@/backend/services/commonService";
import { CustomerService } from "@/backend/services/customer.service";
import Pager from "@/components/Pager";
import CustomerFilter from "@/features/customers/components/CustomerFilter";
import CustomerList from "@/features/customers/components/CustomerList";
import { CustomerListActions } from "@/features/customers/components/CustomerListActions";
import { PAGINATION } from "@/lib/definitions";
import { Users } from "lucide-react";

interface CustomersPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    term?: string;
    specialPricing?: string;
    tempBalance?: string;
    barangays?: string;
  }>;
}

export default async function CustomerReportsPage({
  searchParams,
}: CustomersPageProps) {
  await initDatabase();
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const term = params?.term || "";
  const specialPricing = params?.specialPricing === "true";
  const tempBalance = params?.tempBalance === "true";
  const barangayParam =
    params?.barangays && params?.barangays.length > 0
      ? params.barangays?.split(",")
      : [];

  const barangays = CommonService.getBarangays();
  let customers: { rows: any[]; pagination: any } = {
    rows: [],
    pagination: { total: 0, currentPage: 1, totalPages: 1 },
  };
  try {
    const res = await CustomerService.getAll({
      limit,
      page,
      query: {
        term,
        withSpecialPricing: specialPricing,
        withTemporaryBalanceOnly: tempBalance,
        selectedBarangays: barangayParam,
      },
    });
    if (res) {
      customers = res;
    }
  } catch (err) {
    customers = {
      rows: [],
      pagination: { total: 0, currentPage: 1, totalPages: 1 },
    };
  }
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users />
            Customers
          </h1>
          <p className="text-muted-foreground">Customers Report</p>
        </div>

        <CustomerListActions />
      </div>
      <CustomerFilter barangays={barangays} />

      <CustomerList customers={customers} />
      <Pager initial={customers.pagination} />
    </div>
  );
}
