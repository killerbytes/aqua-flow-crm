import { initDatabase } from "@/backend/db/database";
import { CommonService } from "@/backend/services/commonService";
import { CustomerService } from "@/backend/services/customer.service";
import Pager from "@/components/Pager";
import CustomerFilter from "@/features/customers/components/CustomerFilter";
import CustomerList from "@/features/customers/components/CustomerList";
import { CustomerFormModalButton } from "@/components/ActionButtons";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PAGINATION, UserRole } from "@/lib/definitions";
import { Plus, Users } from "lucide-react";

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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await initDatabase();

  const params = await searchParams;
  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const term = params?.term || "";
  const specialPricing = params?.specialPricing === "true";
  const tempBalance = params?.tempBalance === "true";
  const barangays = params?.barangays ? params.barangays.split(",") : [];

  let customers: { rows: any[]; pagination: any };

  try {
    customers = await CustomerService.getAll({
      page,
      limit,
      query: {
        term,
        withSpecialPricing: specialPricing,
        withTemporaryBalanceOnly: tempBalance,
        selectedBarangays: barangays,
      },
    });
  } catch (err) {
    customers = {
      rows: [],
      pagination: { total: 0, totalPages: 0, currentPage: 0 },
    };
  }

  const barangayList = await CommonService.getBarangays();

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

        <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
          <CustomerFormModalButton>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </CustomerFormModalButton>
        </RoleGuard>
      </div>

      <CustomerFilter barangays={barangayList} />

      <CustomerList customers={customers} />

      <Pager initial={customers.pagination} />
    </div>
  );
}
