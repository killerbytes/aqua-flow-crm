"use client";

import CustomerLookup from "@/components/CustomerLookup";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { Search, UserPlus } from "lucide-react";
import React from "react";

export const CustomerListActions: React.FC = () => {
  const { setCustomerFormModalOpen, setCustomerLookupModalOpen } = useUIStore();

  return (
    <div className="flex items-center gap-1">
      <CustomerLookup>
        <Button
          variant="outline"
          onClick={() => setCustomerLookupModalOpen(true)}
          className="gap-2"
        >
          <Search className="w-4 h-4" />
        </Button>
      </CustomerLookup>

      <Button onClick={() => setCustomerFormModalOpen(true)} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Add Customer
      </Button>
    </div>
  );
};
