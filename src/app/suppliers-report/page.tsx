"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Users, Factory, Share2, FileText, Trash2, ArrowRightLeft, Calendar as CalendarIcon, Plus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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

const transferSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  fromSupplier: z.string().min(1, "يجب اختيار المورد المحول منه."),
  toSupplier: z.string().min(1, "يجب اختيار المورد المحول إليه."),
  reason: z.string().trim().min(1, "يجب كتابة سبب التحويل."),
  method: z.string().trim().min(1, "يجب تحديد طريقة التحويل."),
}).refine(data => data.fromSupplier !== data.toSupplier, {
  message: "لا يمكن التحويل إلى نفس المورد.",
  path: ["toSupplier"],
});
type TransferFormValues = z.infer<typeof transferSchema>;


export default function SuppliersReportPage() {
  const { transactions, deleteSupplier, balanceTransfers, addBalanceTransfer } = useTransactions();
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTransferDatePopoverOpen, setIsTransferDatePopoverOpen] = useState(false);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      fromSupplier: "",
      toSupplier: "",
      reason: "",
      method: "تحويل بنكي",
    },
  });

  const onSubmitTransfer = async (values: TransferFormValues) => {
    await addBalanceTransfer(values);
    transferForm.reset();
    setIsTransferDialogOpen(false);
  };

  const supplierSummaries = useMemo(() => {
    const supplierData: { [key: string]: Transaction[] } = {};

    transactions.forEach(t => {
      if (!supplierData[t.supplierName]) {
        supplierData[t.supplierName] = [];
      }
      supplierData[t.supplierName].push(t);
    });

    const transferAdjustments = new Map<string, number>();
    balanceTransfers.forEach(transfer => {
      transferAdjustments.set(transfer.fromSupplier, (transferAdjustments.get(transfer.fromSupplier) || 0) - transfer.amount);
      transferAdjustments.set(transfer.toSupplier, (transferAdjustments.get(transfer.toSupplier) || 0) + transfer.amount);
    });

    const summaries: SupplierSummary[] = Object.keys(supplierData).map(supplierName => {
      const supplierTransactions = supplierData[supplierName];
      
      let totalSales = 0;
      let totalPurchases = 0;
      let totalPaidToFactory = 0;
      let totalReceivedFromSupplier = 0;
      let totalQuantityPurchased = 0;
      let totalQuantitySold = 0;
      let remainingStockValue = 0;


      supplierTransactions.forEach(t => {
        totalSales += t.totalSellingPrice;
        totalPurchases += t.totalPurchasePrice;
        totalPaidToFactory += t.amountPaidToFactory;
        totalReceivedFromSupplier += t.amountReceivedFromSupplier;
        totalQuantityPurchased += t.quantity;
        if (t.totalSellingPrice > 0) {
            totalQuantitySold += t.quantity;
        } else {
            remainingStockValue += t.totalPurchasePrice;
        }
      });
      
      const adjustment = transferAdjustments.get(supplierName) || 0;
      const adjustedTotalReceived = totalReceivedFromSupplier + adjustment;

      const finalSalesBalance = adjustedTotalReceived - totalSales;
      const finalCashFlowBalance = totalPaidToFactory - totalSales;
      const finalFactoryBalance = totalPaidToFactory - totalPurchases;
      const remainingQuantity = totalQuantityPurchased - totalQuantitySold;

      return {
        supplierName,
        totalSales,
        totalPurchases,
        totalReceivedFromSupplier: adjustedTotalReceived,
        totalQuantityPurchased,
        remainingQuantity,
        remainingStockValue,
        finalSalesBalance,
        finalCashFlowBalance,
        finalFactoryBalance,
        transactionCount: supplierTransactions.length,
      };
    });

    return summaries.sort((a, b) => b.totalSales - a.totalSales);
  }, [transactions, balanceTransfers]);
  
  const { totalSuppliers, totalFactoryBalance } = useMemo(() => {
    const factoryBalance = supplierSummaries.reduce((acc, curr) => acc + curr.finalFactoryBalance, 0);
    return {
      totalSuppliers: supplierSummaries.length,
      totalFactoryBalance: factoryBalance,
    };
  }, [supplierSummaries]);

  const sortedTransfers = useMemo(() => {
      return [...balanceTransfers].sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [balanceTransfers]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Users className="w-8 h-8" />
            تقرير الموردين
          </h1>
        </div>
        <Button onClick={() => setIsTransferDialogOpen(true)}>
          <ArrowRightLeft className="ml-2 h-4 w-4" />
          تحويل رصيد بين الموردين
        </Button>
      </header>
      
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تحويل رصيد بين الموردين</DialogTitle>
          </DialogHeader>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(onSubmitTransfer)} className="grid gap-4 py-4">
              <FormField
                control={transferForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ التحويل</FormLabel>
                    <Popover modal={false} open={isTransferDatePopoverOpen} onOpenChange={setIsTransferDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsTransferDatePopoverOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transferForm.control}
                name="fromSupplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المورد المحول منه</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={transferForm.control}
                name="toSupplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المورد المحول إليه</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={transferForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ المحول</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transferForm.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة التحويل</FormLabel>
                    <FormControl><Input placeholder="مثال: تحويل بنكي" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transferForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السبب / البيان</FormLabel>
                    <FormControl><Textarea placeholder="اكتب سببًا واضحًا للتحويل..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                 <DialogClose asChild>
                  <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
                <Button type="submit">حفظ التحويل</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
            <CardTitle className="text-sm font-medium">إجمالي رصيد الموردين لدى المصنع</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
             <p className="text-xs text-muted-foreground">على أساس (إجمالي المدفوع للمصنع - إجمالي المشتريات)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>ملخص أرصدة الموردين</CardTitle>
          <p className="text-sm text-muted-foreground pt-2">
            يعرض هذا التقرير ملخصًا لأرصدة الموردين. اضغط على اسم المورد لعرض سجله الكامل.
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المورد</TableHead>
                  <TableHead>مبلغ المشتريات</TableHead>
                  <TableHead>إجمالي المبيعات</TableHead>
                  <TableHead>المستلم (بعد التحويلات)</TableHead>
                  <TableHead>الكمية المشتراة (طن)</TableHead>
                  <TableHead>الكمية المتبقية (طن)</TableHead>
                  <TableHead>قيمة الكمية المتبقية</TableHead>
                  <TableHead>رصيد المبيعات</TableHead>
                  <TableHead>الرصيد النقدي</TableHead>
                  <TableHead>رصيد لدى المصنع</TableHead>
                  <TableHead>عدد العمليات</TableHead>
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
                        {item.totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell>
                        {item.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                       <TableCell className="text-success">
                        {item.totalReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell>
                        {item.totalQuantityPurchased.toLocaleString('ar-EG')}
                      </TableCell>
                       <TableCell>
                        {item.remainingQuantity.toLocaleString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        {item.remainingStockValue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell className={`font-bold ${item.finalSalesBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {item.finalSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                       <TableCell className={`font-bold ${item.finalCashFlowBalance >= 0 ? 'text-destructive' : 'text-success'}`}>
                        {item.finalCashFlowBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell className={`font-bold ${item.finalFactoryBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {item.finalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell>
                        {item.transactionCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/sales-balance-report/${encodeURIComponent(item.supplierName)}`} target="_blank" rel="noopener noreferrer" title={`التقرير المبسط لـ ${item.supplierName}`}>
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">التقرير المبسط لـ {item.supplierName}</span>
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/share/supplier/${encodeURIComponent(item.supplierName)}`} target="_blank" rel="noopener noreferrer" title={`مشاركة تقرير ${item.supplierName}`}>
                              <Share2 className="h-4 w-4" />
                              <span className="sr-only">مشاركة تقرير {item.supplierName}</span>
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title={`حذف المورد ${item.supplierName}`}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف المورد {item.supplierName}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المورد بشكل دائم
                                  ({item.supplierName}) وجميع سجلات عملياته.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSupplier(item.supplierName)}>متابعة</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center">
                      لا يوجد موردين لعرضهم. قم بإضافة عمليات أولاً.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {sortedTransfers.length > 0 && (
         <Card>
          <CardHeader>
            <CardTitle>سجل تحويلات الأرصدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المحول منه</TableHead>
                    <TableHead>المحول إليه</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الطريقة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell className="font-medium text-destructive">{t.fromSupplier}</TableCell>
                      <TableCell className="font-medium text-success">{t.toSupplier}</TableCell>
                      <TableCell className="font-bold">{t.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>{t.reason}</TableCell>
                      <TableCell>{t.method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
