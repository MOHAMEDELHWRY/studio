"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookUser, LineChart, Factory, Users, SidebarClose } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import { Button } from './ui/button';

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    { href: '/', label: 'لوحة التحكم', icon: BookUser, isActive: () => pathname === '/' },
    { href: '/suppliers-report', label: 'تقرير الموردين', icon: Users, isActive: () => pathname === '/suppliers-report' || pathname.startsWith('/supplier/') },
    { href: '/factory-report', label: 'تقرير المصنع', icon: Factory, isActive: () => pathname === '/factory-report' },
    { href: '/reports', label: 'تقارير المبيعات', icon: LineChart, isActive: () => pathname === '/reports' },
  ];

  return (
    <Sidebar side="right">
      <SidebarHeader className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sidebar-foreground p-2 group-data-[collapsible=icon]:hidden">
          دفتر حساباتي
        </h2>
         <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpenMobile(false)}>
            <SidebarClose />
            <span className="sr-only">Close sidebar</span>
          </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={item.isActive()} tooltip={{ children: item.label }}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
