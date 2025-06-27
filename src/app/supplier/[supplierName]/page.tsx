"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowRight, DollarSign, Package, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@/types';

export default function SupplierReportPage() {
  const router = useRouter();
  const params = useParams();
  const { transactions, deleteSupplier } = useTransactions();
  const { toast } = useToast();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const supplierTransactionsAsc = useMemo(() => {
    if (!supplierName) return [];
    return transactions
      .filter(t => t.supplierName === supplierName)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [transactions, supplierName]);
  
  const transactionsWithBalance = useMemo(() => {
    let balance = 0;
    return supplierTransactionsAsc.map(t => {
      balance += t.amountReceivedFromSupplier + t.amountPaidToFactory - t.totalPurchasePrice;
      return { ...t, runningBalance: balance };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first for display
  }, [supplierTransactionsAsc]);

  const supplierStats = useMemo(() => {
    return supplierTransactionsAsc.reduce((acc, t) => {
      acc.totalPurchases += t.totalPurchasePrice;
      acc.totalPaid += t.amountPaidToFactory;
      acc.totalReceived += t.amountReceivedFromSupplier;
      return acc;
    }, { totalPurchases: 0, totalPaid: 0, totalReceived: 0 });
  }, [supplierTransactionsAsc]);

  const finalBalance = transactionsWithBalance.length > 0 ? transactionsWithBalance[0].runningBalance : 0;
  
  const handleDeleteSupplier = () => {
    deleteSupplier(supplierName);
    toast({
      title: 'تم الحذف',
      description: `تم حذف المورد "${supplierName}" وجميع عملياته بنجاح.`,
      variant: 'default',
    });
    router.push('/');
  };

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
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-primary">تقرير المورد: {supplierName}</h1>
        <div className="flex gap-2">
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="ml-2 h-4 w-4" />
                حذف المورد
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                <AlertDialogDescription>
                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المورد بشكل دائم
                  ({supplierName}) وجميع سجلات عملياته.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSupplier}>متابعة</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild variant="outline">
            <Link href="/">
               <ArrowRight className="ml-2 h-4 w-4" /> العودة للوحة التحكم
            </Link>
          </Button>
        </div>
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
            <div className="text-2xl font-bold text-primary">
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
            <div className="text-2xl font-bold text-success">
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
            <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {finalBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
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
                <TableHead>المحافظة</TableHead>
                <TableHead>المركز</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>تاريخ التنفيذ</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>إجمالي الشراء</TableHead>
                <TableHead>المدفوع للمصنع</TableHead>
                <TableHead>المستلم من المورد</TableHead>
                <TableHead>رصيد المورد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsWithBalance.length > 0 ? (
                transactionsWithBalance.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                    <TableCell>{t.governorate}</TableCell>
                    <TableCell>{t.city}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell>{format(t.executionDate, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                    <TableCell>{format(t.dueDate, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                    <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className="text-primary">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className="text-success">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className={`font-bold ${t.runningBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{t.runningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center">
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
