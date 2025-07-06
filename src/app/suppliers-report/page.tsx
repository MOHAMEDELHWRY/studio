"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { Users, Factory, Share2, FileText, Trash2 } from 'lucide-react';
import { type Transaction } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarTrigger } from '@/components/ui/sidebar';
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

interface SupplierSummary {
  supplierName: string;
  totalSales: number;
  totalPurchases: number;
  totalReceivedFromSupplier: number;
  totalQuantityPurchased: number;
  remainingQuantity: number;
  remainingStockValue: number;
  finalSalesBalance: number;
  finalCashFlowBalance: number;
  finalFactoryBalance: number;
  transactionCount: number;
}

export default function SuppliersReportPage() {
  const { transactions, deleteSupplier, balanceTransfers, supplierPayments } = useTransactions();

  const supplierSummaries = useMemo(() => {
    const supplierData: { [key: string]: Transaction[] } = {};
    transactions.forEach(t => {
      if (!supplierData[t.supplierName]) supplierData[t.supplierName] = [];
      supplierData[t.supplierName].push(t);
    });

    const transferAdjustments = new Map<string, number>();
    balanceTransfers.forEach(transfer => {
      transferAdjustments.set(transfer.fromSupplier, (transferAdjustments.get(transfer.fromSupplier) || 0) - transfer.amount);
      transferAdjustments.set(transfer.toSupplier, (transferAdjustments.get(transfer.toSupplier) || 0) + transfer.amount);
    });

    const salesPaymentAdjustments = new Map<string, number>();
    const factoryPaymentAdjustments = new Map<string, number>();

    supplierPayments.forEach(payment => {
      if (payment.classification === 'سداد للمصنع عن المورد') {
        factoryPaymentAdjustments.set(payment.supplierName, (factoryPaymentAdjustments.get(payment.supplierName) || 0) + payment.amount);
      } else if (payment.classification === 'استعادة مبلغ كتسوية') {
        salesPaymentAdjustments.set(payment.supplierName, (salesPaymentAdjustments.get(payment.supplierName) || 0) - payment.amount);
      } else { // 'دفعة من رصيد المبيعات' or 'سحب أرباح للمورد'
        salesPaymentAdjustments.set(payment.supplierName, (salesPaymentAdjustments.get(payment.supplierName) || 0) + payment.amount);
      }
    });

    const summaries: SupplierSummary[] = Object.keys(supplierData).map(supplierName => {
      const supplierTransactions = supplierData[supplierName];
      let totalSales = 0, totalPurchases = 0, totalPaidToFactory = 0, totalReceivedFromSupplier = 0, totalQuantityPurchased = 0, totalQuantitySold = 0, remainingStockValue = 0;
      
      supplierTransactions.forEach(t => {
        totalSales += t.totalSellingPrice;
        totalPurchases += t.totalPurchasePrice;
        totalPaidToFactory += t.amountPaidToFactory;
        totalReceivedFromSupplier += t.amountReceivedFromSupplier;
        totalQuantityPurchased += t.quantity;
        if (t.totalSellingPrice > 0) totalQuantitySold += t.quantity;
        else remainingStockValue += t.totalPurchasePrice;
      });
      
      const transferAdj = transferAdjustments.get(supplierName) || 0;
      const salesPaymentAdj = salesPaymentAdjustments.get(supplierName) || 0;
      const factoryPaymentAdj = factoryPaymentAdjustments.get(supplierName) || 0;
      
      const adjustedTotalReceived = totalReceivedFromSupplier + transferAdj - salesPaymentAdj;
      const adjustedTotalPaidToFactory = totalPaidToFactory + factoryPaymentAdj;

      const finalSalesBalance = adjustedTotalReceived - totalSales;
      const finalFactoryBalance = adjustedTotalPaidToFactory - totalPurchases;
      const finalCashFlowBalance = finalSalesBalance - finalFactoryBalance;
      const remainingQuantity = totalQuantityPurchased - totalQuantitySold;

      return {
        supplierName, totalSales, totalPurchases, totalReceivedFromSupplier: adjustedTotalReceived, totalQuantityPurchased,
        remainingQuantity, remainingStockValue, finalSalesBalance, finalCashFlowBalance, finalFactoryBalance,
        transactionCount: supplierTransactions.length,
      };
    });
    return summaries.sort((a, b) => b.totalSales - a.totalSales);
  }, [transactions, balanceTransfers, supplierPayments]);
  
  const { totalSuppliers, totalFactoryBalance } = useMemo(() => {
    const factoryBalance = supplierSummaries.reduce((acc, curr) => acc + curr.finalFactoryBalance, 0);
    return { totalSuppliers: supplierSummaries.length, totalFactoryBalance: factoryBalance };
  }, [supplierSummaries]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Users className="w-8 h-8" />تقرير الموردين</h1>
        </div>
      </header>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">إجمالي عدد الموردين</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalSuppliers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">إجمالي رصيد الموردين لدى المصنع</CardTitle><Factory className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={`text-2xl font-bold ${totalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{totalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div><p className="text-xs text-muted-foreground">على أساس (إجمالي المدفوع للمصنع - إجمالي المشتريات)</p></CardContent></Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>ملخص أرصدة الموردين</CardTitle>
          <p className="text-sm text-muted-foreground pt-2">يعرض هذا التقرير ملخصًا لأرصدة الموردين. اضغط على اسم المورد لعرض سجله الكامل.</p>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader><TableRow>
                <TableHead>اسم المورد</TableHead><TableHead>مبلغ المشتريات</TableHead><TableHead>إجمالي المبيعات</TableHead><TableHead>المستلم (بعد التسويات)</TableHead><TableHead>الكمية المشتراة (طن)</TableHead><TableHead>الكمية المتبقية (طن)</TableHead><TableHead>قيمة الكمية المتبقية</TableHead><TableHead>رصيد المبيعات</TableHead><TableHead>الرصيد النقدي</TableHead><TableHead>رصيد لدى المصنع</TableHead><TableHead>عدد العمليات</TableHead><TableHead>إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {supplierSummaries.length > 0 ? (
                  supplierSummaries.map(item => (
                    <TableRow key={item.supplierName}>
                      <TableCell className="font-medium"><Link href={`/supplier/${encodeURIComponent(item.supplierName)}`} className="text-primary hover:underline">{item.supplierName}</Link></TableCell>
                      <TableCell>{item.totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>{item.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell className="text-success">{item.totalReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>{item.totalQuantityPurchased.toLocaleString('ar-EG')}</TableCell>
                      <TableCell>{item.remainingQuantity.toLocaleString('ar-EG')}</TableCell>
                      <TableCell>{item.remainingStockValue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell className={`font-bold ${item.finalSalesBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{item.finalSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell className={`font-bold ${item.finalCashFlowBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{item.finalCashFlowBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell className={`font-bold ${item.finalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{item.finalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>{item.transactionCount}</TableCell>
                      <TableCell><div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon"><Link href={`/sales-balance-report/${encodeURIComponent(item.supplierName)}`} target="_blank" rel="noopener noreferrer" title={`التقرير المبسط لـ ${item.supplierName}`}><FileText className="h-4 w-4" /><span className="sr-only">التقرير المبسط لـ {item.supplierName}</span></Link></Button>
                        <Button asChild variant="ghost" size="icon"><Link href={`/share/supplier/${encodeURIComponent(item.supplierName)}`} target="_blank" rel="noopener noreferrer" title={`مشاركة تقرير ${item.supplierName}`}><Share2 className="h-4 w-4" /><span className="sr-only">مشاركة تقرير {item.supplierName}</span></Link></Button>
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title={`حذف المورد ${item.supplierName}`}><Trash2 className="h-4 w-4" /><span className="sr-only">حذف المورد {item.supplierName}</span></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المورد بشكل دائم ({item.supplierName}) وجميع سجلات عملياته.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteSupplier(item.supplierName)}>متابعة</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div></TableCell>
                    </TableRow>
                  ))
                ) : (<TableRow><TableCell colSpan={12} className="h-24 text-center">لا يوجد موردين لعرضهم. قم بإضافة عمليات أولاً.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
