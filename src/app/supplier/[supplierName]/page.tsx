"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DollarSign, Package, Trash2, Factory, LineChart, Share2, Landmark, Warehouse, FileText, Wallet } from 'lucide-react';
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
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function SupplierReportPage() {
  const router = useRouter();
  const params = useParams();
  const { transactions, deleteSupplier, expenses } = useTransactions();
  const { toast } = useToast();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const supplierTransactionsAsc = useMemo(() => {
    if (!supplierName) return [];
    return transactions
      .filter(t => t.supplierName === supplierName)
      .sort((a, b) => {
        const dateA = a.date.getTime();
        const dateB = b.date.getTime();
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        return a.id.localeCompare(b.id);
      });
  }, [transactions, supplierName]);
  
  const { 
    transactionsWithBalances, 
    supplierStats, 
    tonBreakdown, 
    finalFactoryBalance,
    supplierLinkedExpenses,
  } = useMemo(() => {
    let runningFactoryBalance = 0;

    const stats = { 
      totalPurchases: 0, 
      totalSales: 0, 
      totalProfit: 0,
      totalPaidToFactory: 0, 
      totalReceivedFromSupplier: 0,
      totalTonsPurchased: 0,
      totalTonsSold: 0,
    };

    const breakdown: {
        byCategory: { [key: string]: { purchased: number; sold: number } },
        byVariety: { [key: string]: { purchased: number; sold: number } }
    } = {
        byCategory: {},
        byVariety: {}
    };

    let totalTaxesOnSoldItems = 0;
    let remainingStockValue = 0;

    supplierTransactionsAsc.forEach(t => {
      // Aggregate main stats
      stats.totalPurchases += t.totalPurchasePrice;
      stats.totalSales += t.totalSellingPrice;
      stats.totalPaidToFactory += t.amountPaidToFactory;
      stats.totalReceivedFromSupplier += t.amountReceivedFromSupplier;
      stats.totalTonsPurchased += t.quantity;

      const isSold = t.totalSellingPrice > 0;
      if (isSold) {
        stats.totalTonsSold += t.quantity;
        totalTaxesOnSoldItems += t.taxes;
      } else {
        remainingStockValue += t.totalPurchasePrice;
      }

      // Category breakdown
      if (t.category) {
          if (!breakdown.byCategory[t.category]) {
              breakdown.byCategory[t.category] = { purchased: 0, sold: 0 };
          }
          breakdown.byCategory[t.category].purchased += t.quantity;
          if (isSold) {
              breakdown.byCategory[t.category].sold += t.quantity;
          }
      }

      // Variety breakdown
      if (t.variety) {
          if (!breakdown.byVariety[t.variety]) {
              breakdown.byVariety[t.variety] = { purchased: 0, sold: 0 };
          }
          breakdown.byVariety[t.variety].purchased += t.quantity;
          if (isSold) {
              breakdown.byVariety[t.variety].sold += t.quantity;
          }
      }
    });

    const costOfGoodsSold = stats.totalPurchases - remainingStockValue;

    const supplierExpensesTotal = expenses
      .filter(e => e.supplierName === supplierName)
      .reduce((sum, e) => sum + e.amount, 0);

    stats.totalProfit = stats.totalSales - costOfGoodsSold - totalTaxesOnSoldItems - supplierExpensesTotal;
    
    const supplierExpensesList = expenses
      .filter(e => e.supplierName === supplierName)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const transactionsWithBalances = supplierTransactionsAsc.map(t => {
      runningFactoryBalance += t.amountPaidToFactory - t.totalPurchasePrice;
      return { ...t, factoryRunningBalance: runningFactoryBalance };
    }).reverse();
    
    const finalFactoryBalance = stats.totalPaidToFactory - stats.totalPurchases;

    return { 
      transactionsWithBalances, 
      supplierStats: stats, 
      tonBreakdown: breakdown,
      finalFactoryBalance,
      supplierLinkedExpenses: supplierExpensesList,
    };
  }, [supplierTransactionsAsc, expenses, supplierName]);
  
  const handleDeleteSupplier = async () => {
    await deleteSupplier(supplierName);
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
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-primary">تقرير المورد: {supplierName}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
           <Button asChild variant="outline">
              <Link href={`/share/supplier/${encodeURIComponent(supplierName)}`} target="_blank" rel="noopener noreferrer">
                <Share2 className="ml-2 h-4 w-4" />
                مشاركة / طباعة
              </Link>
           </Button>
            <Button asChild variant="outline">
              <Link href={`/sales-balance-report/${encodeURIComponent(supplierName)}`} target="_blank" rel="noopener noreferrer">
                <FileText className="ml-2 h-4 w-4" />
                تقرير رصيد المبيعات
              </Link>
            </Button>
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
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierStats.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الربح</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${supplierStats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {supplierStats.totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
             <p className="text-xs text-muted-foreground">بعد خصم المصروفات الخاصة بالمورد</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوع للمصنع</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {supplierStats.totalPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستلم من المورد</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {supplierStats.totalReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رصيد لدى المصنع</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${finalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {finalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
            <p className="text-xs text-muted-foreground">(المدفوع للمصنع) - (إجمالي الشراء)</p>
          </CardContent>
        </Card>
      </div>

       {supplierLinkedExpenses.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet/> مصروفات خاصة بالمورد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>أمر الصرف</TableHead>
                    <TableHead>المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierLinkedExpenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{format(e.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{e.paymentOrder || '-'}</TableCell>
                      <TableCell className="text-destructive">{e.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="mb-8">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                ملخص الأطنان
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                    <TableRow>
                        <TableHead>الصنف / النوع</TableHead>
                        <TableHead>إجمالي المشتراة</TableHead>
                        <TableHead>إجمالي المباعة</TableHead>
                        <TableHead>المتبقي</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell>الإجمالي الكلي</TableCell>
                        <TableCell>{supplierStats.totalTonsPurchased.toLocaleString('ar-EG')} طن</TableCell>
                        <TableCell>{supplierStats.totalTonsSold.toLocaleString('ar-EG')} طن</TableCell>
                        <TableCell>{(supplierStats.totalTonsPurchased - supplierStats.totalTonsSold).toLocaleString('ar-EG')} طن</TableCell>
                    </TableRow>
                    {Object.entries(tonBreakdown.byCategory).map(([category, data]) => (
                        <TableRow key={category}>
                            <TableCell>{category}</TableCell>
                            <TableCell>{data.purchased.toLocaleString('ar-EG')} طن</TableCell>
                            <TableCell>{data.sold.toLocaleString('ar-EG')} طن</TableCell>
                            <TableCell>{(data.purchased - data.sold).toLocaleString('ar-EG')} طن</TableCell>
                        </TableRow>
                    ))}
                    {Object.entries(tonBreakdown.byVariety).map(([variety, data]) => (
                         <TableRow key={variety}>
                            <TableCell>نوع {variety}</TableCell>
                            <TableCell>{data.purchased.toLocaleString('ar-EG')} طن</TableCell>
                            <TableCell>{data.sold.toLocaleString('ar-EG')} طن</TableCell>
                            <TableCell>{(data.purchased - data.sold).toLocaleString('ar-EG')} طن</TableCell>
                        </TableRow>
                    ))}
                    
                    {Object.keys(tonBreakdown.byCategory).length === 0 && Object.keys(tonBreakdown.byVariety).length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">لا توجد تفاصيل أصناف أو أنواع مسجلة.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
    </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل عمليات المورد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>الكمية / التفاصيل</TableHead>
                  <TableHead>إجمالي الشراء</TableHead>
                  <TableHead>إجمالي البيع</TableHead>
                  <TableHead>الربح</TableHead>
                  <TableHead>المدفوع للمصنع</TableHead>
                  <TableHead>المستلم من المورد</TableHead>
                  <TableHead>رصيد لدى المصنع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalances.length > 0 ? (
                  transactionsWithBalances.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell>{[t.governorate, t.city].filter(Boolean).join(' - ')}</TableCell>
                      <TableCell>
                        {`${t.quantity.toLocaleString('ar-EG')} طن`}
                        {(t.category || t.variety) && (
                          <span className="text-muted-foreground text-xs mx-1">
                            ({[t.category, t.variety].filter(Boolean).join(' / ')})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>
                        {t.totalSellingPrice > 0 ? (
                          t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                        ) : (
                          <span className="text-muted-foreground">لم يتم البيع</span>
                        )}
                      </TableCell>
                       <TableCell className={`font-bold ${t.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {t.totalSellingPrice > 0 ? (
                          t.profit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                       </TableCell>
                      <TableCell className="text-primary">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell className="text-success">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                       <TableCell className={`font-bold ${t.factoryRunningBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{t.factoryRunningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      لا توجد عمليات لهذا المورد.
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
