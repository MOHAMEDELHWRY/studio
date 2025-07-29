"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { Factory, DollarSign, BarChart as BarChartIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface SupplierBalance {
  supplierName: string;
  totalPaidToFactory: number;
  totalPurchases: number;
  balance: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    return (
      <div className="p-3 bg-card border rounded-lg shadow-lg">
        <p className="font-bold mb-2 text-card-foreground">{label}</p>
        <div className="text-sm flex justify-between items-center gap-4">
            <span>الرصيد:</span>
            <span className={`font-semibold ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
              {value.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function FactoryReportPage() {
  const { transactions } = useTransactions();

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

    // Sort by name for stable chart order
    return balances.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  }, [transactions]);

  const totalBalance = useMemo(() => {
    return supplierBalances.reduce((acc, curr) => acc + curr.balance, 0);
  }, [supplierBalances]);

  const sortedTableData = useMemo(() => {
    return [...supplierBalances].sort((a, b) => b.balance - a.balance);
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
              {totalBalance >= 0 ? 'رصيد دائن إجمالي للموردين' : 'رصيد مدين إجمالي على الموردين'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                الرسم البياني لأرصدة الموردين لدى المصنع
            </CardTitle>
        </CardHeader>
        <CardContent>
            {supplierBalances.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, supplierBalances.length * 40)}>
                    <BarChart
                        data={supplierBalances}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact' }).format(value as number)} />
                        <YAxis dataKey="supplierName" type="category" width={100} interval={0} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--card) / 0.8)' }} />
                        <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                            {supplierBalances.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">لا توجد بيانات لعرض الرسم البياني.</div>
            )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>تفاصيل أرصدة الموردين لدى المصنع</CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            يتم حساب الرصيد كالتالي: (إجمالي المدفوع للمصنع) - (إجمالي المشتريات)
          </p>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto">
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
                  {sortedTableData.length > 0 ? (
                    sortedTableData.map(item => (
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
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
