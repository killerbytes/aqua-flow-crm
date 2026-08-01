import { initDatabase } from "@/backend/db/database";
import { CommonService } from "@/backend/services/commonService";
import { CustomerService } from "@/backend/services/customer.service";
import Pager from "@/components/Pager";
import CustomerFilter from "@/features/customers/components/CustomerFilter";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import CustomerList from "@/features/customers/components/CustomerList";
import { CustomerListActions } from "@/features/customers/components/CustomerListActions";
import { Users } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface CustomersPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    term?: string;
    specialPricing?: string;
    barangays?: string;
  }>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  await initDatabase();
  const params = await searchParams;

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 5;
  const term = params?.term || "";
  const specialPricing = params?.specialPricing === "true";
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users />
            Customers
          </h1>
          <p className="text-muted-foreground">
            View customer profiles, contact info, owed container balances, and
            temporary loan status.
          </p>
        </div>

        <CustomerListActions />
      </div>
      <CustomerFilter barangays={barangays} />

      {!customers?.rows || customers.rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium">No customer records found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Add Customer&quot; to create the first profile.
          </p>
        </div>
      ) : (
        <>
          <CustomerList customers={customers} />
          <Pager initial={customers.pagination} />
        </>
      )}

      {/* Client Dialog Modals */}
      <Suspense>
        <CustomerFormModal barangays={barangays} />
      </Suspense>
    </div>
  );
}
