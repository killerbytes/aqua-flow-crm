import "@/app/globals.css";
import MainLayout from "@/components/shared/MainLayout";
import Providers from "@/components/shared/Providers";
import Sidebar from "@/components/shared/Sidebar";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import React from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AquaFlow Next - Modern CRM & Water Station Management",
  description:
    "Next.js 15 Server Components CRM for water refilling stations with GraphQL, Sequelize, and RBAC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
      // className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex antialiased`}
      >
        <Providers>
          <Sidebar />
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
