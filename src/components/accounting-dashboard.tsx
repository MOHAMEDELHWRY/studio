"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Download,
  Plus,
  Search,
  TrendingUp,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
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
  type: z.string().min(1, 'النوع مطلوب.'),
  quantity: z.coerce.number().min(0, 'الكمية يجب أن تكون موجبة.'),
  price: z.coerce.number().min(0, 'السعر يجب أن يكون موجبًا.'),
  description: z.string().min(1, 'الوصف مطلوب.'),
  movement: z.enum(['debit', 'credit'], { required_error: 'يجب تحديد نوع الحركة.' }),
  amount: z.coerce.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر.'),
});

const initialTransactions: Transaction[] = [
  { id: '1', date: new Date('2023-10-01'), type: 'مبيعات', quantity: 10, price: 150, description: 'بيع أجهزة إلكترونية', debit: 1500, credit: 0 },
  { id: '2', date: new Date('2023-10-05'), type: 'مشتريات', quantity: 5, price: 80, description: 'شراء مواد خام', debit: 0, credit: 400 },
  { id: '3', date: new Date('2023-11-12'), type: 'راتب', quantity: 1, price: 3000, description: 'راتب موظف', debit: 0, credit: 3000 },
  { id: '4', date: new Date('2023-11-20'), type: 'مبيعات', quantity: 20, price: 100, description: 'بيع برمجيات', debit: 2000, credit: 0 },
  { id: '5', date: new Date('2023-12-15'), type: 'إيجار', quantity: 1, price: 1200, description: 'إيجار المكتب', debit: 0, credit: 1200 },
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
      quantity: 1,
      price: 0,
      amount: 0,
      description: "",
      type: ""
    },
  });

   useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "quantity" || name === "price") {
        form.setValue("amount", (value.quantity || 0) * (value.price || 0));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (values: z.infer<typeof transactionSchema>) => {
    const newTransaction: Transaction = {
      id: new Date().toISOString(),
      date: values.date,
      type: values.type,
      quantity: values.quantity,
      price: values.price,
      description: values.description,
      debit: values.movement === 'debit' ? values.amount : 0,
      credit: values.movement === 'credit' ? values.amount : 0,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    toast({
      title: "نجاح",
      description: "تمت إضافة العملية بنجاح.",
      className: "bg-green-500 text-white",
    });
    form.reset();
    setIsDialogOpen(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchMatch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = dateFilter ? format(t.date, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd') : true;
      return searchMatch && dateMatch;
    });
  }, [transactions, searchTerm, dateFilter]);

  const { totalDebit, totalCredit, balance } = useMemo(() => {
    const totalDebit = filteredTransactions.reduce((acc, t) => acc + t.debit, 0);
    const totalCredit = filteredTransactions.reduce((acc, t) => acc + t.credit, 0);
    const balance = totalDebit - totalCredit;
    return { totalDebit, totalCredit, balance };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { debit: number; credit: number } } = {};
    filteredTransactions.forEach(t => {
      const month = format(t.date, 'MMM yyyy', { locale: ar });
      if (!monthlyData[month]) {
        monthlyData[month] = { debit: 0, credit: 0 };
      }
      monthlyData[month].debit += t.debit;
      monthlyData[month].credit += t.credit;
    });
    return Object.entries(monthlyData)
      .map(([name, values]) => ({ name, ...values }))
      .reverse();
  }, [filteredTransactions]);

  const handleExport = () => {
    const headers = ["ID", "التاريخ", "النوع", "الكمية", "السعر", "الوصف", "مدين", "دائن"];
    
    const escapeCSV = (str: any) => {
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const rows = transactions.map(t =>
      [
        escapeCSV(t.id),
        format(t.date, 'yyyy-MM-dd'),
        escapeCSV(t.type),
        t.quantity,
        t.price,
        escapeCSV(t.description),
        t.debit,
        t.credit
      ].join(',')
    );

    // Adding BOM for Excel to recognize UTF-8
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
          <CreditCard className="w-8 h-8"/> دفتر حساباتي
        </h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" /> إضافة عملية
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-lg">
              <DialogHeader>
                <DialogTitle>إضافة عملية جديدة</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الحركة</FormLabel>
                        <FormControl>
                          <Textarea placeholder="مثال: بيع منتجات" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>النوع</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: مبيعات، مشتريات" {...field} />
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
                                  className={cn(
                                    "w-full justify-start text-right font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="ml-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
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
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                    control={form.control}
                    name="movement"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>نوع الحركة</FormLabel>
                          <div className="flex gap-4">
                            <Button type="button" variant={field.value === 'debit' ? 'default' : 'outline'} onClick={() => field.onChange('debit')} className="flex-1">
                                <ArrowUp className="ml-2 h-4 w-4"/> إيراد (مدين)
                            </Button>
                            <Button type="button" variant={field.value === 'credit' ? 'destructive' : 'outline'} onClick={() => field.onChange('credit')} className="flex-1">
                               <ArrowDown className="ml-2 h-4 w-4" /> مصروف (دائن)
                            </Button>
                          </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ الإجمالي</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} readOnly className="font-bold bg-muted" />
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
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDebit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرصيد الحالي</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>سجل العمليات</CardTitle>
                    <div className="flex flex-col md:flex-row gap-2 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            placeholder="بحث بالوصف أو النوع..."
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
                            <TableHead>الوصف</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>مدين</TableHead>
                            <TableHead>دائن</TableHead>
                            <TableHead>الرصيد</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.reduce((acc, t, index) => {
                            const prevBalance = index > 0 ? acc[index - 1].balance : 0;
                            const currentBalance = prevBalance + t.debit - t.credit;
                            acc.push({ ...t, balance: currentBalance });
                            return acc;
                            }, [] as (Transaction & { balance: number })[]).map((t) => (
                                <TableRow key={t.id}>
                                <TableCell>
                                    <div className="font-medium">{t.description}</div>
                                    <div className="text-sm text-muted-foreground">{t.type}</div>
                                </TableCell>
                                <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                                <TableCell className="text-green-600">{t.debit > 0 ? t.debit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}</TableCell>
                                <TableCell className="text-red-600">{t.credit > 0 ? t.credit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}</TableCell>
                                <TableCell className="font-medium">{t.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">لا توجد عمليات لعرضها.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp/> الحركة المالية الشهرية</CardTitle>
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
                            name === 'debit' ? 'إيرادات' : 'مصروفات'
                         ]}
                         cursor={{fill: 'hsl(var(--muted))'}}
                        />
                        <Bar dataKey="debit" fill="hsl(var(--primary))" name="إيرادات" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="credit" fill="hsl(var(--destructive))" name="مصروفات" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
