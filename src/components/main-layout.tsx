"use client";

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import React from 'react';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPrintPage = pathname.startsWith('/share/') || pathname.startsWith('/sales-balance-report/');

  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
