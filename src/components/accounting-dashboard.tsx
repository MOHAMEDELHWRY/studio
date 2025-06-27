"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import {
  DollarSign,
  Download,
  Pencil,
  Plus,
  Search,
  LineChart,
  Calendar as CalendarIcon,
  ShoppingCart,
  Users,
  MinusCircle,
  Wallet,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { type Transaction, type Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { SidebarTrigger } from './ui/sidebar';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { analyzePerformance } from '@/ai/flows/analyze-performance-flow';

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

const expenseSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  description: z.string().trim().min(1, "الوصف مطلوب."),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function AccountingDashboard() {
  const { transactions, addTransaction, updateTransaction, expenses, addExpense, updateExpense, deleteExpense, loading } = useTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // States for controlling date picker popovers
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isExecDatePopoverOpen, setIsExecDatePopoverOpen] = useState(false);
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);
  const [isExpenseDatePopoverOpen, setIsExpenseDatePopoverOpen] = useState(false);
  const [isFilterDatePopoverOpen, setIsFilterDatePopoverOpen] = useState(false);

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
  
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      amount: 0,
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
  
  const handleOpenExpenseDialog = (expense: Expense | null) => {
    setEditingExpense(expense);
    if (expense) {
      expenseForm.reset({
        ...expense,
        date: new Date(expense.date),
      });
    } else {
      expenseForm.reset({
        date: new Date(),
        description: "",
        amount: 0,
      });
    }
    setIsExpenseDialogOpen(true);
  };
  
  const onExpenseDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingExpense(null);
    }
    setIsExpenseDialogOpen(open);
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingTransaction(null);
    }
    setIsDialogOpen(open);
  };


  const onSubmit = async (values: TransactionFormValues) => {
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
            await updateTransaction(updatedTransaction);
            toast({
              title: "نجاح",
              description: "تم تعديل العملية بنجاح.",
              variant: "default"
            });
        } else {
            const newTransaction: Omit<Transaction, 'id'> = {
              ...values,
              city: values.city ?? "",
              totalPurchasePrice,
              totalSellingPrice,
              profit,
            };
            
            await addTransaction(newTransaction);
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
  
  const onSubmitExpense = async (values: ExpenseFormValues) => {
    if (editingExpense) {
      await updateExpense({ ...editingExpense, ...values });
      toast({ title: "نجاح", description: "تم تعديل المصروف بنجاح." });
    } else {
      await addExpense(values);
      toast({ title: "نجاح", description: "تمت إضافة المصروف بنجاح." });
    }
    expenseForm.reset();
    setIsExpenseDialogOpen(false);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    toast({
      title: "تم الحذف",
      description: "تم حذف المصروف بنجاح.",
      variant: "default",
    });
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
  
  const { totalSales, totalPurchases, profitFromTransactions, totalSuppliersSalesBalance } = useMemo(() => {
    const stats = transactions.reduce((acc, t) => {
        acc.totalSales += t.totalSellingPrice;
        acc.totalPurchases += t.totalPurchasePrice;
        acc.profitFromTransactions += t.profit;
        return acc;
    }, { totalSales: 0, totalPurchases: 0, profitFromTransactions: 0 });

    const supplierBalances: { [key: string]: number } = {};
    transactions.forEach(t => {
        if (!supplierBalances[t.supplierName]) {
            supplierBalances[t.supplierName] = 0;
        }
        supplierBalances[t.supplierName] += t.amountReceivedFromSupplier - t.totalSellingPrice;
    });
    
    const balance = Object.values(supplierBalances).reduce((acc, cur) => acc + cur, 0);

    return { ...stats, totalSuppliersSalesBalance: balance };
  }, [transactions]);
  
  const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const totalProfit = profitFromTransactions - totalExpenses;

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
    const headers = ["مسلسل", "التاريخ", "تاريخ التنفيذ", "تاريخ الاستحقاق", "اسم المورد", "المحافظة", "المركز", "الوصف", "النوع", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المدفوع للمصنع", "المستلم من المورد"];
    
    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return "";
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const rows = filteredAndSortedTransactions.map((t, index) =>
      [
        filteredAndSortedTransactions.length - index,
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
        t.amountReceivedFromSupplier
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
  
  const handleAnalyzePerformance = async () => {
    if (transactions.length === 0) {
      toast({
        title: 'لا توجد بيانات كافية',
        description: 'يجب إضافة بعض العمليات أولاً قبل طلب التحليل.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(''); // Clear previous analysis

    try {
      const analysisInput = {
        transactions: transactions.map(t => ({
          date: t.date.toISOString(),
          supplierName: t.supplierName,
          governorate: t.governorate,
          city: t.city,
          totalSellingPrice: t.totalSellingPrice,
          profit: t.profit,
        })),
        totalProfit: totalProfit,
        totalExpenses: totalExpenses,
      };

      const result = await analyzePerformance(analysisInput);
      setAnalysis(result);
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: 'خطأ في التحليل',
        description: 'حدث خطأ أثناء توليد التحليل. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalPurchasePriceDisplay = (watchedValues.quantity || 0) * (watchedValues.purchasePrice || 0);
  const totalSellingPriceDisplay = (watchedValues.quantity || 0) * (watchedValues.sellingPrice || 0);
  const profitDisplay = totalSellingPriceDisplay - totalPurchasePriceDisplay - (watchedValues.taxes || 0);
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
        <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold text-primary">لوحة التحكم</h1>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
        </div>
        
        <div className="mb-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4 rounded" />
              <div className="flex flex-col md:flex-row gap-2 mt-4">
                <Skeleton className="h-10 flex-1 rounded" />
                <Skeleton className="h-10 w-[240px] rounded" />
              </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded" />
                    <Skeleton className="h-12 w-full rounded" />
                    <Skeleton className="h-12 w-full rounded" />
                    <Skeleton className="h-12 w-full rounded" />
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-primary">
            لوحة التحكم
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={() => handleOpenDialog(null)}>
            <Plus className="ml-2 h-4 w-4" /> إضافة عملية
          </Button>
           <Button variant="outline" onClick={() => handleOpenExpenseDialog(null)}>
            <MinusCircle className="ml-2 h-4 w-4" /> إضافة مصروف
          </Button>
           <Button variant="outline" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" /> تصدير CSV
          </Button>
        </div>
      </header>

       <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'تعديل عملية' : 'إضافة عملية جديدة'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-h-[80vh] overflow-y-auto pr-6 pl-2">
                  <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>المعلومات الأساسية</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
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
                                    <Calendar 
                                      mode="single" 
                                      selected={field.value} 
                                      onSelect={(date) => {
                                        field.onChange(date);
                                        setIsDatePopoverOpen(false);
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
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>تفاصيل البضاعة والتسعير</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        <FormItem className="mt-4">
                            <FormLabel>صافي الربح</FormLabel>
                            <FormControl>
                              <Input type="number" value={profitDisplay} readOnly className="font-bold bg-muted" />
                            </FormControl>
                          </FormItem>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>المدفوعات والتواريخ الهامة</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                          <FormField
                            control={form.control}
                            name="executionDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>تاريخ التنفيذ</FormLabel>
                                <Popover open={isExecDatePopoverOpen} onOpenChange={setIsExecDatePopoverOpen}>
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
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        field.onChange(date);
                                        setIsExecDatePopoverOpen(false);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>تاريخ الاستحقاق</FormLabel>
                                <Popover open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}>
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
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        field.onChange(date);
                                        setIsDueDatePopoverOpen(false);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <DialogFooter className="pt-4">
                    <Button type="submit">حفظ العملية</Button>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
           <Dialog open={isExpenseDialogOpen} onOpenChange={onExpenseDialogOpenChange}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</DialogTitle>
              </DialogHeader>
              <Form {...expenseForm}>
                <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="grid gap-4 py-4">
                  <FormField
                    control={expenseForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>تاريخ المصروف</FormLabel>
                        <Popover open={isExpenseDatePopoverOpen} onOpenChange={setIsExpenseDatePopoverOpen}>
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
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsExpenseDatePopoverOpen(false);
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
                    control={expenseForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl><Input placeholder="مثال: سحب أرباح" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">حفظ المصروف</Button>
                     <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

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
            <CardTitle className="text-sm font-medium">إجمالي أرصدة المبيعات</CardTitle>
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
            <CardTitle className="text-sm font-medium">صافي الربح (بعد المصروفات)</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
             <p className="text-xs text-muted-foreground">
              الربح {profitFromTransactions.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})} - المصروفات {totalExpenses.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-8">
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
                      <Popover open={isFilterDatePopoverOpen} onOpenChange={setIsFilterDatePopoverOpen}>
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
                              <Calendar
                                mode="single"
                                selected={dateFilter}
                                onSelect={(date) => {
                                  setDateFilter(date);
                                  setIsFilterDatePopoverOpen(false);
                                }}
                                initialFocus
                              />
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
                          <TableHead>الإجراءات</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {filteredAndSortedTransactions.length > 0 ? (
                          filteredAndSortedTransactions.map((t, index) => (
                              <TableRow key={t.id}>
                              <TableCell>{filteredAndSortedTransactions.length - index}</TableCell>
                              <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                              <TableCell>
                                  <Link href={`/supplier/${encodeURIComponent(t.supplierName)}`} className="font-medium text-primary hover:underline">{t.supplierName}</Link>
                              </TableCell>
                              <TableCell>{t.description}</TableCell>
                              <TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                              <TableCell>
                                {t.totalSellingPrice > 0 ? (
                                  t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                                ) : (
                                  <span className="text-muted-foreground">لم يتم البيع</span>
                                )}
                              </TableCell>
                              <TableCell className={`font-bold ${t.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{t.profit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                              <TableCell className="text-primary">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                              <TableCell className="text-success">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
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
                          <TableCell colSpan={10} className="h-24 text-center">لا توجد عمليات لعرضها.</TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
           <Card className="h-full flex flex-col">
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
        <div className="lg:col-span-1 flex flex-col gap-8">
           <Card className="flex-1 flex flex-col">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wand2/> تحليل مالي بالذكاء الاصطناعي</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                  {isAnalyzing ? (
                      <div className="space-y-4 flex-grow p-4 text-center flex flex-col justify-center">
                          <p className="text-sm text-muted-foreground">جاري تحليل البيانات، قد يستغرق الأمر بضع ثوانٍ...</p>
                          <Skeleton className="h-4 w-5/6 mx-auto" />
                          <Skeleton className="h-4 w-full mx-auto" />
                          <Skeleton className="h-4 w-4/6 mx-auto" />
                      </div>
                  ) : analysis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-right text-sm h-64 overflow-y-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                      </div>
                  ) : (
                      <div className="text-center text-muted-foreground flex-grow flex flex-col justify-center items-center gap-4">
                          <p className="text-sm">احصل على رؤى حول أدائك المالي، وتعرف على أفضل الموردين والمناطق مبيعًا.</p>
                          <Button onClick={handleAnalyzePerformance} disabled={isAnalyzing}>
                            <Wand2 className="ml-2 h-4 w-4" />
                            {isAnalyzing ? "جاري التحليل..." : "توليد التحليل"}
                          </Button>
                      </div>
                  )}
              </CardContent>
               {transactions.length > 0 && !analysis && !isAnalyzing && (
                <CardFooter>
                  <p className="text-xs text-muted-foreground w-full text-center">
                    يتم إنشاء التحليل بناءً على البيانات الحالية.
                  </p>
                </CardFooter>
              )}
            </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet/> سجل المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length > 0 ? (
                    expenses.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{format(e.date, 'dd-MM-yy')}</TableCell>
                        <TableCell>{e.description}</TableCell>
                        <TableCell className="text-destructive">{e.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                        <TableCell className="flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenExpenseDialog(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هذا الإجراء سيحذف المصروف بشكل دائم ولا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense(e.id)}>متابعة</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">لا توجد مصروفات.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
