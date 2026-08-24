import { Customer } from "@/backend/models";
import { CommonService } from "@/backend/services/commonService";
import {
  CustomerQueryParams,
  CustomerService,
} from "@/backend/services/customer.service";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CustomerLookupButton } from "@/components/CustomerLookupButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import { CustomerFormModalButton } from "@/features/customers/components/CustomerFormModalButton";
import CustomerList from "@/features/customers/components/CustomerList";
import { PAGINATION, UserRole } from "@/lib/definitions";
import { Search, UserPlus, Users } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface CustomersPageProps {
  searchParams?: Promise<CustomerQueryParams>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const sort = params?.sort;
  const order = params?.order;

  const barangays = CommonService.getBarangays();
  let customers: {
    rows: Customer[];
    pagination: {
      total: number;
      currentPage: number;
      totalPages: number;
    };
  } = {
    rows: [],
    pagination: { total: 0, currentPage: 1, totalPages: 1 },
  };
  try {
    const res = await CustomerService.getAll({
      limit,
      page,
      sort,
      order,
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
      <div className="md:flex justify-between items-center space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SidebarTrigger />
            <div className="bg-border h-5 w-[1px]"></div>
            <Users />
            Customers
          </h1>
          <p className="text-muted-foreground">
            View customer profiles, contact info, owed container balances, and
            temporary loan status.
          </p>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <CustomerLookupButton variant="outline">
            <Search />
          </CustomerLookupButton>
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
          >
            <CustomerFormModalButton>
              <UserPlus className="w-4 h-4" />
              Add Customer
            </CustomerFormModalButton>
          </RoleGuard>
        </div>
      </div>

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
        </>
      )}

      <Suspense>
        <CustomerFormModal barangays={barangays} />
      </Suspense>
    </div>
  );
}
