"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowRight, DollarSign, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SupplierReportPage() {
  const router = useRouter();
  const params = useParams();
  const { transactions } = useTransactions();
  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const supplierTransactions = useMemo(() => {
    if (!supplierName) return [];
    return transactions
      .filter(t => t.supplierName === supplierName)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, supplierName]);

  const supplierStats = useMemo(() => {
    return supplierTransactions.reduce((acc, t) => {
      acc.totalPurchases += t.totalPurchasePrice;
      acc.totalPaid += t.amountPaidToFactory;
      acc.totalReceived += t.amountReceivedFromSupplier;
      return acc;
    }, { totalPurchases: 0, totalPaid: 0, totalReceived: 0 });
  }, [supplierTransactions]);

  const supplierBalance = supplierStats.totalPurchases - supplierStats.totalPaid - supplierStats.totalReceived;

  if (!supplierName) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p>اسم المورد غير محدد.</p>
        <Button onClick={() => router.push('/')} className="mt-4">العودة للوحة التحكم</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">تقرير المورد: {supplierName}</h1>
        <Button asChild variant="outline">
          <Link href="/">
             العودة للوحة التحكم <ArrowRight className="mr-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierStats.totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوع للمصنع</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {supplierStats.totalPaid.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستلم من المورد</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {supplierStats.totalReceived.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرصيد النهائي للمورد</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${supplierBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {supplierBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل عمليات المورد</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>إجمالي الشراء</TableHead>
                <TableHead>المدفوع للمصنع</TableHead>
                <TableHead>المستلم من المورد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierTransactions.length > 0 ? (
                supplierTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className="text-blue-600">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className="text-green-600">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    لا توجد عمليات لهذا المورد.
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
