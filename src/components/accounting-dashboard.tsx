"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import {
  BookUser,
  DollarSign,
  Download,
  Pencil,
  Plus,
  Search,
  LineChart,
  Calendar as CalendarIcon,
  ShoppingCart,
  Users,
  Factory,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { type Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/context/transactions-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { governorates, cities } from '@/data/egypt-governorates';

const transactionSchema = z.object({
  date: z.date({ required_error: 'التاريخ مطلوب.' }),
  executionDate: z.date({ required_error: 'تاريخ التنفيذ مطلوب.' }),
  dueDate: z.date({ required_error: 'تاريخ الاستحقاق مطلوب.' }),
  supplierName: z.string().trim().min(1, 'اسم المورد مطلوب.'),
  governorate: z.string().min(1, 'المحافظة مطلوبة.'),
  city: z.string().optional(),
  description: z.string().min(1, 'الوصف مطلوب.'),
  type: z.string().min(1, 'النوع مطلوب.'),
  quantity: z.coerce.number().min(1, 'الكمية يجب أن تكون 1 على الأقل.'),
  purchasePrice: z.coerce.number().min(0, 'سعر الشراء يجب أن يكون موجبًا.'),
  sellingPrice: z.coerce.number().min(0, 'سعر البيع يجب أن يكون موجبًا.'),
  taxes: z.coerce.number().min(0, 'الضرائب يجب أن تكون موجبة.').default(0),
  amountPaidToFactory: z.coerce.number().min(0, 'المبلغ المدفوع يجب أن يكون موجبًا.').default(0),
  amountReceivedFromSupplier: z.coerce.number().min(0, 'المبلغ المستلم يجب أن يكون موجبًا.').default(0),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AccountingDashboard() {
  const { transactions, addTransaction, updateTransaction } = useTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      executionDate: new Date(),
      dueDate: new Date(),
      supplierName: "",
      governorate: "",
      city: "",
      description: "",
      type: "",
      quantity: 1,
      purchasePrice: 0,
      sellingPrice: 0,
      taxes: 0,
      amountPaidToFactory: 0,
      amountReceivedFromSupplier: 0,
    },
  });

  const { watch, setValue } = form;
  const watchedValues = watch();
  const selectedGovernorate = watch("governorate");

  useEffect(() => {
      if (selectedGovernorate) {
          setAvailableCities(cities[selectedGovernorate] || []);
          setValue("city", "", { shouldValidate: false });
      } else {
          setAvailableCities([]);
      }
  }, [selectedGovernorate, setValue]);


  const handleOpenDialog = (transaction: Transaction | null) => {
    setEditingTransaction(transaction);
    if (transaction) {
      form.reset({
        ...transaction,
        date: new Date(transaction.date),
        executionDate: new Date(transaction.executionDate),
        dueDate: new Date(transaction.dueDate),
      });
       if (transaction.governorate) {
        setAvailableCities(cities[transaction.governorate] || []);
      }
    } else {
      form.reset({
        date: new Date(),
        executionDate: new Date(),
        dueDate: new Date(),
        supplierName: "",
        governorate: "",
        city: "",
        description: "",
        type: "",
        quantity: 1,
        purchasePrice: 0,
        sellingPrice: 0,
        taxes: 0,
        amountPaidToFactory: 0,
        amountReceivedFromSupplier: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingTransaction(null);
    }
    setIsDialogOpen(open);
  };


  const onSubmit = (values: TransactionFormValues) => {
    try {
        const totalPurchasePrice = values.quantity * values.purchasePrice;
        const totalSellingPrice = values.quantity * values.sellingPrice;
        const profit = totalSellingPrice - totalPurchasePrice - values.taxes;

        if (editingTransaction) {
            const updatedTransaction: Transaction = {
              ...editingTransaction,
              ...values,
              city: values.city ?? "",
              totalPurchasePrice,
              totalSellingPrice,
              profit,
            };
            updateTransaction(updatedTransaction);
            toast({
              title: "نجاح",
              description: "تم تعديل العملية بنجاح.",
              variant: "default"
            });
        } else {
            const newTransaction: Transaction = {
              id: new Date().toISOString(),
              ...values,
              city: values.city ?? "",
              totalPurchasePrice,
              totalSellingPrice,
              profit,
            };
            
            addTransaction(newTransaction);
            toast({
              title: "نجاح",
              description: "تمت إضافة العملية بنجاح.",
              variant: "default"
            });
        }
        form.reset();
        setIsDialogOpen(false);
    } catch (error) {
        toast({
            title: "خطأ في الإدخال",
            description: "حدث خطأ أثناء حفظ العملية. يرجى مراجعة البيانات المدخلة والمحاولة مرة أخرى.",
            variant: "destructive",
        });
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchMatch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.governorate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.type.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = dateFilter ? format(t.date, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd') : true;
      return searchMatch && dateMatch;
    }).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchTerm, dateFilter]);
  
  const transactionsWithBalances = useMemo(() => {
    const supplierGroups: { [key: string]: Transaction[] } = {};

    // Group transactions by supplier
    transactions.forEach(t => {
      if (!supplierGroups[t.supplierName]) {
        supplierGroups[t.supplierName] = [];
      }
      supplierGroups[t.supplierName].push(t);
    });

    const allTransactionsWithBalances: (Transaction & { supplierSalesBalance: number; supplierCashFlowBalance: number; })[] = [];

    // Calculate running balances for each supplier
    for (const supplierName in supplierGroups) {
      const sortedTransactions = supplierGroups[supplierName].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      let salesBalance = 0;
      let cashFlowBalance = 0;

      const transactionsForSupplier = sortedTransactions.map(t => {
        salesBalance += t.amountReceivedFromSupplier - t.totalSellingPrice;
        cashFlowBalance += t.amountReceivedFromSupplier - t.amountPaidToFactory;
        return {
          ...t,
          supplierSalesBalance: salesBalance,
          supplierCashFlowBalance: cashFlowBalance,
        };
      });
      allTransactionsWithBalances.push(...transactionsForSupplier);
    }

    // Filter and sort the combined list for display
    return allTransactionsWithBalances
      .filter(t => filteredAndSortedTransactions.some(ft => ft.id === t.id))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
      
  }, [transactions, filteredAndSortedTransactions]);

  const { totalSales, totalPurchases, totalProfit, totalSuppliersSalesBalance } = useMemo(() => {
    const stats = filteredAndSortedTransactions.reduce((acc, t) => {
        acc.totalSales += t.totalSellingPrice;
        acc.totalPurchases += t.totalPurchasePrice;
        acc.totalProfit += t.profit;
        return acc;
    }, { totalSales: 0, totalPurchases: 0, totalProfit: 0 });

    const supplierBalances: { [key: string]: number } = {};
    transactions.forEach(t => {
        if (!supplierBalances[t.supplierName]) {
            supplierBalances[t.supplierName] = 0;
        }
        supplierBalances[t.supplierName] += t.amountReceivedFromSupplier - t.totalSellingPrice;
    });
    
    const balance = Object.values(supplierBalances).reduce((acc, cur) => acc + cur, 0);

    return { ...stats, totalSuppliersSalesBalance: balance };
  }, [filteredAndSortedTransactions, transactions]);

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { profit: number } } = {};
    filteredAndSortedTransactions.forEach(t => {
      const month = format(t.date, 'MMM yyyy', { locale: ar });
      if (!monthlyData[month]) {
        monthlyData[month] = { profit: 0 };
      }
      monthlyData[month].profit += t.profit;
    });
    return Object.entries(monthlyData)
      .map(([name, values]) => ({ name, ...values }))
      .reverse();
  }, [filteredAndSortedTransactions]);

  const handleExport = () => {
    const headers = ["مسلسل", "التاريخ", "تاريخ التنفيذ", "تاريخ الاستحقاق", "اسم المورد", "المحافظة", "المركز", "الوصف", "النوع", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المدفوع للمصنع", "المستلم من المورد", "رصيد المبيعات", "الرصيد النقدي"];
    
    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return "";
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const rows = transactionsWithBalances.map((t, index) =>
      [
        transactionsWithBalances.length - index,
        format(t.date, 'yyyy-MM-dd'),
        format(t.executionDate, 'yyyy-MM-dd'),
        format(t.dueDate, 'yyyy-MM-dd'),
        escapeCSV(t.supplierName),
        escapeCSV(t.governorate),
        escapeCSV(t.city),
        escapeCSV(t.description),
        escapeCSV(t.type),
        t.quantity,
        t.purchasePrice,
        t.totalPurchasePrice,
        t.sellingPrice,
        t.totalSellingPrice,
        t.taxes,
        t.profit,
        t.amountPaidToFactory,
        t.amountReceivedFromSupplier,
        t.supplierSalesBalance,
        t.supplierCashFlowBalance
      ].join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPurchasePriceDisplay = (watchedValues.quantity || 0) * (watchedValues.purchasePrice || 0);
  const totalSellingPriceDisplay = (watchedValues.quantity || 0) * (watchedValues.sellingPrice || 0);
  const profitDisplay = totalSellingPriceDisplay - totalPurchasePriceDisplay - (watchedValues.taxes || 0);
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <BookUser className="w-8 h-8"/> دفتر حسابات الموردين
        </h1>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={() => handleOpenDialog(null)}>
            <Plus className="ml-2 h-4 w-4" /> إضافة عملية
          </Button>
           <Button asChild variant="secondary">
              <Link href="/suppliers-report">
                <Users className="ml-2 h-4 w-4" /> تقرير الموردين
              </Link>
          </Button>
           <Button asChild variant="secondary">
              <Link href="/factory-report">
                <Factory className="ml-2 h-4 w-4" /> تقرير المصنع
              </Link>
          </Button>
           <Button asChild variant="secondary">
              <Link href="/reports">
                <LineChart className="ml-2 h-4 w-4" /> تقارير المبيعات والأرباح
              </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'تعديل عملية' : 'إضافة عملية جديدة'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplierName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المورد</FormLabel>
                          <FormControl>
                            <Input placeholder="اسم المورد" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاريخ العملية</FormLabel>
                          <Popover>
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
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="governorate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المحافظة</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر المحافظة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {governorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المركز (اختياري)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={availableCities.length === 0}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر المركز" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوصف</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الوصف" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="معبأ">معبأ</SelectItem>
                              <SelectItem value="سائب">سائب</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>النوع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="22.5">22.5</SelectItem>
                              <SelectItem value="32.5">32.5</SelectItem>
                              <SelectItem value="42.5">42.5</SelectItem>
                              <SelectItem value="52.5">52.5</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكمية</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="taxes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الضرائب</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="executionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاريخ التنفيذ</FormLabel>
                          <Popover>
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
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سعر الشراء</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاريخ الاستحقاق</FormLabel>
                          <Popover>
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
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سعر البيع</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormItem>
                        <FormLabel>إجمالي سعر الشراء</FormLabel>
                        <FormControl>
                          <Input type="number" value={totalPurchasePriceDisplay} readOnly className="font-bold bg-muted" />
                        </FormControl>
                      </FormItem>
                      <FormItem>
                        <FormLabel>إجمالي سعر البيع</FormLabel>
                        <FormControl>
                          <Input type="number" value={totalSellingPriceDisplay} readOnly className="font-bold bg-muted" />
                        </FormControl>
                      </FormItem>
                  </div>
                   <FormItem>
                      <FormLabel>صافي الربح</FormLabel>
                      <FormControl>
                        <Input type="number" value={profitDisplay} readOnly className="font-bold bg-muted" />
                      </FormControl>
                    </FormItem>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="amountPaidToFactory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المبلغ المدفوع للمصنع</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amountReceivedFromSupplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المبلغ المستلم من المورد</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   </div>

                  <DialogFooter>
                    <Button type="submit">حفظ العملية</Button>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
           <Button variant="outline" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" /> تصدير CSV
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي أرصدة الموردين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSuppliersSalesBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalSuppliersSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
             <p className="text-xs text-muted-foreground">على أساس (مستلم - مبيعات)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>سجل العمليات</CardTitle>
                    <div className="flex flex-col md:flex-row gap-2 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            placeholder="بحث بالوصف أو اسم المورد..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn("w-full md:w-[240px] justify-start text-right font-normal", !dateFilter && "text-muted-foreground")}
                                >
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {dateFilter ? format(dateFilter, "PPP", { locale: ar }) : <span>فلترة بالتاريخ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                            </PopoverContent>
                        </Popover>
                         {dateFilter && <Button variant="ghost" onClick={() => setDateFilter(undefined)}>مسح الفلتر</Button>}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>م</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>اسم المورد</TableHead>
                            <TableHead>الوصف</TableHead>
                            <TableHead>إجمالي الشراء</TableHead>
                            <TableHead>إجمالي البيع</TableHead>
                            <TableHead>صافي الربح</TableHead>
                            <TableHead>المدفوع للمصنع</TableHead>
                            <TableHead>المستلم من المورد</TableHead>
                            <TableHead>رصيد المبيعات</TableHead>
                             <TableHead>الرصيد النقدي</TableHead>
                            <TableHead>الإجراءات</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {transactionsWithBalances.length > 0 ? (
                            transactionsWithBalances.map((t, index) => (
                                <TableRow key={t.id}>
                                <TableCell>{transactionsWithBalances.length - index}</TableCell>
                                <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                                <TableCell>
                                    <Link href={`/supplier/${encodeURIComponent(t.supplierName)}`} className="font-medium text-primary hover:underline">{t.supplierName}</Link>
                                </TableCell>
                                <TableCell>{t.description}</TableCell>
                                <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell>{t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell className={`font-bold ${t.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{t.profit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell className="text-primary">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell className="text-success">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell className={`font-bold ${t.supplierSalesBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{t.supplierSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell className={`font-bold ${t.supplierCashFlowBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{t.supplierCashFlowBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(t)} className="text-muted-foreground hover:text-primary">
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">تعديل</span>
                                  </Button>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={12} className="h-24 text-center">لا توجد عمليات لعرضها.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
      <div className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LineChart/> ملخص الربح الشهري</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} />
                        <YAxis width={80} tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact' }).format(value as number)} />
                        <Tooltip
                         formatter={(value, name) => [
                            (value as number).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }),
                            'صافي الربح'
                         ]}
                         cursor={{fill: 'hsl(var(--muted))'}}
                        />
                        <Bar dataKey="profit" fill="hsl(var(--primary))" name="الربح" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
      </div>
    </div>
  );
}
