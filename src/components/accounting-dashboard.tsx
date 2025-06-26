"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  BookUser,
  DollarSign,
  Download,
  Plus,
  Search,
  LineChart,
  Calendar as CalendarIcon,
  ShoppingCart,
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
  DialogTrigger,
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
import { Textarea } from './ui/textarea';

const transactionSchema = z.object({
  date: z.date({ required_error: 'التاريخ مطلوب.' }),
  supplierName: z.string().min(1, 'اسم المورد مطلوب.'),
  description: z.string().min(1, 'الوصف مطلوب.'),
  quantity: z.coerce.number().min(1, 'الكمية يجب أن تكون 1 على الأقل.'),
  purchasePrice: z.coerce.number().min(0, 'سعر الشراء يجب أن يكون موجبًا.'),
  sellingPrice: z.coerce.number().min(0, 'سعر البيع يجب أن يكون موجبًا.'),
  taxes: z.coerce.number().min(0, 'الضرائب يجب أن تكون موجبة.').default(0),
  paidAmount: z.coerce.number().min(0, 'المبلغ المدفوع يجب أن يكون موجبًا.').default(0),
  totalPurchasePrice: z.coerce.number().optional(),
  totalSellingPrice: z.coerce.number().optional(),
  profit: z.coerce.number().optional(),
});

const initialTransactions: Transaction[] = [
    { id: '1', date: new Date('2023-10-01'), supplierName: 'مورد ألف', description: 'مواد بناء', quantity: 10, purchasePrice: 150, totalPurchasePrice: 1500, sellingPrice: 200, totalSellingPrice: 2000, taxes: 50, profit: 450, paidAmount: 1000 },
    { id: '2', date: new Date('2023-10-05'), supplierName: 'مورد باء', description: 'أدوات كهربائية', quantity: 5, purchasePrice: 80, totalPurchasePrice: 400, sellingPrice: 120, totalSellingPrice: 600, taxes: 20, profit: 180, paidAmount: 400 },
    { id: '3', date: new Date('2023-11-12'), supplierName: 'مورد ألف', description: 'إسمنت', quantity: 20, purchasePrice: 50, totalPurchasePrice: 1000, sellingPrice: 65, totalSellingPrice: 1300, taxes: 30, profit: 270, paidAmount: 500 },
];

export default function AccountingDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      quantity: 1,
      purchasePrice: 0,
      sellingPrice: 0,
      taxes: 0,
      paidAmount: 0,
      supplierName: "",
      description: "",
    },
  });

   useEffect(() => {
    const subscription = form.watch((values) => {
        const { quantity = 0, purchasePrice = 0, sellingPrice = 0, taxes = 0 } = values;
        const totalPurchasePrice = quantity * purchasePrice;
        const totalSellingPrice = quantity * sellingPrice;
        const profit = totalSellingPrice - totalPurchasePrice - taxes;
        
        form.setValue("totalPurchasePrice", totalPurchasePrice, { shouldValidate: true });
        form.setValue("totalSellingPrice", totalSellingPrice, { shouldValidate: true });
        form.setValue("profit", profit, { shouldValidate: true });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (values: z.infer<typeof transactionSchema>) => {
    const newTransaction: Transaction = {
      id: new Date().toISOString(),
      date: values.date,
      supplierName: values.supplierName,
      description: values.description,
      quantity: values.quantity,
      purchasePrice: values.purchasePrice,
      sellingPrice: values.sellingPrice,
      taxes: values.taxes || 0,
      paidAmount: values.paidAmount || 0,
      totalPurchasePrice: values.totalPurchasePrice!,
      totalSellingPrice: values.totalSellingPrice!,
      profit: values.profit!,
    };
    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
    toast({
      title: "نجاح",
      description: "تمت إضافة العملية بنجاح.",
    });
    form.reset();
    setIsDialogOpen(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchMatch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = dateFilter ? format(t.date, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd') : true;
      return searchMatch && dateMatch;
    });
  }, [transactions, searchTerm, dateFilter]);

  const { totalSales, totalPurchases, totalProfit } = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
        acc.totalSales += t.totalSellingPrice;
        acc.totalPurchases += t.totalPurchasePrice;
        acc.totalProfit += t.profit;
        return acc;
    }, { totalSales: 0, totalPurchases: 0, totalProfit: 0 });
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { profit: number } } = {};
    filteredTransactions.forEach(t => {
      const month = format(t.date, 'MMM yyyy', { locale: ar });
      if (!monthlyData[month]) {
        monthlyData[month] = { profit: 0 };
      }
      monthlyData[month].profit += t.profit;
    });
    return Object.entries(monthlyData)
      .map(([name, values]) => ({ name, ...values }))
      .reverse();
  }, [filteredTransactions]);

  const handleExport = () => {
    const headers = ["مسلسل", "التاريخ", "اسم المورد", "الوصف", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المبلغ المدفوع"];
    
    const escapeCSV = (str: any) => {
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const rows = transactions.map((t, index) =>
      [
        index + 1,
        format(t.date, 'yyyy-MM-dd'),
        escapeCSV(t.supplierName),
        escapeCSV(t.description),
        t.quantity,
        t.purchasePrice,
        t.totalPurchasePrice,
        t.sellingPrice,
        t.totalSellingPrice,
        t.taxes,
        t.profit,
        t.paidAmount
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
  

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <BookUser className="w-8 h-8"/> دفتر حسابات الموردين
        </h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" /> إضافة عملية
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>إضافة عملية جديدة</DialogTitle>
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
                          <FormLabel>التاريخ</FormLabel>
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
                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف / النوع</FormLabel>
                        <FormControl>
                          <Textarea placeholder="وصف المنتج أو الخدمة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                     <FormField
                        control={form.control}
                        name="totalPurchasePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>إجمالي سعر الشراء</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} readOnly className="font-bold bg-muted" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="totalSellingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>إجمالي سعر البيع</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} readOnly className="font-bold bg-muted" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                  </div>
                   <FormField
                      control={form.control}
                      name="profit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الربح</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} readOnly className="font-bold bg-muted" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                   <FormField
                      control={form.control}
                      name="paidAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ المدفوع للمورد</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                            <TableHead>الضرائب</TableHead>
                            <TableHead>الربح</TableHead>
                            <TableHead>المدفوع</TableHead>
                            <TableHead>رصيد المورد</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredTransactions.length > 0 ? (
                            (() => {
                                const supplierBalances: { [key: string]: number } = {};
                                const transactionsWithBalance = [...filteredTransactions]
                                  .sort((a,b) => a.date.getTime() - b.date.getTime())
                                  .map(t => {
                                    if (supplierBalances[t.supplierName] === undefined) {
                                      supplierBalances[t.supplierName] = 0;
                                    }
                                    supplierBalances[t.supplierName] += t.totalPurchasePrice - t.paidAmount;
                                    return { ...t, supplierBalance: supplierBalances[t.supplierName] };
                                  });
                                
                                return transactionsWithBalance.reverse().map((t, index) => (
                                    <TableRow key={t.id}>
                                    <TableCell>{filteredTransactions.length - index}</TableCell>
                                    <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{t.supplierName}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{t.description}</div>
                                        <div className="text-sm text-muted-foreground">الكمية: {t.quantity}</div>
                                    </TableCell>
                                    <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    <TableCell>{t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    <TableCell>{t.taxes.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    <TableCell className={`font-medium ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.profit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    <TableCell className="text-blue-600">{t.paidAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    <TableCell className={`font-bold ${t.supplierBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{t.supplierBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                    </TableRow>
                                ));
                            })()
                        ) : (
                            <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center">لا توجد عمليات لعرضها.</TableCell>
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
