"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { ArrowRight, Users, Factory, Share2 } from 'lucide-react';
import { type Transaction } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SupplierSummary {
  supplierName: string;
  totalSales: number;
  finalSalesBalance: number;
  finalCashFlowBalance: number;
  finalFactoryBalance: number;
  transactionCount: number;
}

export default function SuppliersReportPage() {
  const { transactions } = useTransactions();

  const supplierSummaries = useMemo(() => {
    const supplierData: { [key: string]: Transaction[] } = {};

    // Group transactions by supplier
    transactions.forEach(t => {
      if (!supplierData[t.supplierName]) {
        supplierData[t.supplierName] = [];
      }
      supplierData[t.supplierName].push(t);
    });

    const summaries: SupplierSummary[] = Object.keys(supplierData).map(supplierName => {
      const supplierTransactions = supplierData[supplierName].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      let salesBalance = 0;
      let cashFlowBalance = 0;
      let totalSales = 0;
      let totalPurchases = 0;
      let totalPaidToFactory = 0;

      supplierTransactions.forEach(t => {
        salesBalance += t.amountReceivedFromSupplier - t.totalSellingPrice;
        cashFlowBalance += t.amountReceivedFromSupplier - t.amountPaidToFactory;
        totalSales += t.totalSellingPrice;
        totalPurchases += t.totalPurchasePrice;
        totalPaidToFactory += t.amountPaidToFactory;
      });

      const finalFactoryBalance = totalPaidToFactory - totalPurchases;

      return {
        supplierName,
        totalSales,
        finalSalesBalance: salesBalance,
        finalCashFlowBalance: cashFlowBalance,
        finalFactoryBalance,
        transactionCount: supplierTransactions.length,
      };
    });

    return summaries.sort((a, b) => b.totalSales - a.totalSales);
  }, [transactions]);
  
  const { totalSuppliers, totalFactoryBalance } = useMemo(() => {
    const factoryBalance = supplierSummaries.reduce((acc, curr) => acc + curr.finalFactoryBalance, 0);
    return {
      totalSuppliers: supplierSummaries.length,
      totalFactoryBalance: factoryBalance,
    };
  }, [supplierSummaries]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Users className="w-8 h-8" />
          تقرير الموردين
        </h1>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowRight className="ml-2 h-4 w-4" /> العودة للوحة التحكم
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي عدد الموردين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي رصيد المصنع</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
             <p className="text-xs text-muted-foreground">على أساس (المدفوع - المشتريات)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ملخص أرصدة الموردين</CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            يعرض هذا التقرير ملخصًا لأرصدة الموردين. اضغط على اسم المورد لعرض سجله الكامل.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المورد</TableHead>
                <TableHead>إجمالي المبيعات</TableHead>
                <TableHead>عدد العمليات</TableHead>
                <TableHead>رصيد المبيعات</TableHead>
                <TableHead>الرصيد النقدي</TableHead>
                <TableHead>رصيد المصنع</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierSummaries.length > 0 ? (
                supplierSummaries.map(item => (
                  <TableRow key={item.supplierName}>
                    <TableCell className="font-medium">
                       <Link href={`/supplier/${encodeURIComponent(item.supplierName)}`} className="text-primary hover:underline">
                         {item.supplierName}
                       </Link>
                    </TableCell>
                    <TableCell>
                      {item.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell>
                      {item.transactionCount}
                    </TableCell>
                    <TableCell className={`font-bold ${item.finalSalesBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.finalSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                     <TableCell className={`font-bold ${item.finalCashFlowBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.finalCashFlowBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell className={`font-bold ${item.finalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.finalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/share/supplier/${encodeURIComponent(item.supplierName)}`} target="_blank" rel="noopener noreferrer">
                          <Share2 className="h-4 w-4" />
                          <span className="sr-only">مشاركة تقرير {item.supplierName}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    لا يوجد موردين لعرضهم. قم بإضافة عمليات أولاً.
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
