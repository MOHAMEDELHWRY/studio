"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/context/transactions-context';
import { Factory, DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface SupplierBalance {
  supplierName: string;
  totalPaidToFactory: number;
  totalPurchases: number;
  balance: number;
}

export default function FactoryReportPage() {
  const { transactions } = useTransactions();
  const router = useRouter();

  const supplierBalances = useMemo(() => {
    const supplierData: { [key: string]: { totalPaidToFactory: number, totalPurchases: number } } = {};

    transactions.forEach(t => {
      if (!supplierData[t.supplierName]) {
        supplierData[t.supplierName] = { totalPaidToFactory: 0, totalPurchases: 0 };
      }
      supplierData[t.supplierName].totalPaidToFactory += t.amountPaidToFactory;
      supplierData[t.supplierName].totalPurchases += t.totalPurchasePrice;
    });

    const balances: SupplierBalance[] = Object.entries(supplierData).map(([supplierName, data]) => {
      const balance = data.totalPaidToFactory - data.totalPurchases;
      return {
        supplierName,
        totalPaidToFactory: data.totalPaidToFactory,
        totalPurchases: data.totalPurchases,
        balance,
      };
    });

    return balances.sort((a, b) => b.balance - a.balance);
  }, [transactions]);

  const totalBalance = useMemo(() => {
    return supplierBalances.reduce((acc, curr) => acc + curr.balance, 0);
  }, [supplierBalances]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center mb-8 gap-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Factory className="w-8 h-8" />
          تقرير أرصدة المصنع
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي رصيد المصنع</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBalance >= 0 ? 'رصيد دائن للموردين' : 'رصيد مدين للموردين'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل أرصدة الموردين لدى المصنع</CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            يتم حساب الرصيد كالتالي: (إجمالي المدفوع للمصنع) - (إجمالي المشتريات)
          </p>
        </CardHeader>
        <CardContent>
          <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>اسم المورد</TableHead>
                <TableHead>إجمالي المدفوع للمصنع</TableHead>
                <TableHead>إجمالي المشتريات</TableHead>
                <TableHead>الرصيد لدى المصنع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierBalances.length > 0 ? (
                supplierBalances.map(item => (
                  <TableRow key={item.supplierName}>
                    <TableCell className="font-medium">
                       <Link href={`/supplier/${encodeURIComponent(item.supplierName)}`} className="text-primary hover:underline">
                         {item.supplierName}
                       </Link>
                    </TableCell>
                    <TableCell className="text-primary">
                      {item.totalPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell>
                      {item.totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell className={`font-bold ${item.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    لا توجد بيانات لعرضها.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
