"use client";

import { useAuthStore } from "@/lib/store";
import React from "react";

export default function MainLayout({
  children,
  serverUser,
}: {
  children: React.ReactNode;
  serverUser: any;
}) {
  const { setUser } = useAuthStore();
  const storeUser = useAuthStore((state) => state.user);

  React.useEffect(() => {
    if (serverUser && (!storeUser || storeUser.userId !== serverUser.userId)) {
      setUser(serverUser);
    }
  }, [serverUser]);

  return (
    <main className="rounded-xl shadow-xl m-2 bg-background grow mx-auto flex flex-col xmin-h-screen gap-4 p-2 md:p-8 size-full relative">
      {children}
    </main>
  );
}
