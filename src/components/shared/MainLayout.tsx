"use client";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="rounded-xl shadow-xl m-2 bg-background grow mx-auto flex flex-col xmin-h-screen gap-4 p-2 md:p-8 size-full relative">
      {children}
    </main>
  );
}
