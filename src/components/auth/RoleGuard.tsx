"use client";

import { UserRole } from "@/lib/definitions";
import { useAuthStore } from "@/lib/store";
import React from "react";

/**
 * Checks if the current user's role is within allowed roles.
 */
export function hasRole(
  userRole: string | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as UserRole);
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render children based on the authenticated user's role.
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated || !hasRole(user?.role, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
