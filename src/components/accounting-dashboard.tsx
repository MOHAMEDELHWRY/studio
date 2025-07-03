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
  Factory,
  Landmark,
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
import { analyzePerformance, type PerformanceAnalysisOutput } from '@/ai/flows/analyze-performance-flow';
import { descriptionOptions, categoryOptions, varietyOptions } from '@/data/transaction-data';

const transactionSchema = z.object({
  date: z.date({ required_error: 'التاريخ مطلوب.' }),
  executionDate: z.date().optional(),
  dueDate: z.date().optional(),
  supplierName: z.string().trim().min(1, 'اسم المورد مطلوب.'),
  governorate: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  variety: z.string().optional(),
  quantity: z.coerce.number().min(0, 'الكمية يجب أن تكون موجبة.').default(0),
  purchasePrice: z.coerce.number().min(0, 'سعر الشراء يجب أن يكون موجبًا.').default(0),
  sellingPrice: z.coerce.number().min(0, 'سعر البيع يجب أن يكون موجبًا.').default(0),
  taxes: z.coerce.number().min(0, 'الضرائب يجب أن تكون موجبة.').default(0),
  amountPaidToFactory: z.coerce.number().min(0, 'المبلغ المدفوع يجب أن يكون موجبًا.').default(0),
  amountReceivedFromSupplier: z.coerce.number().min(0, 'المبلغ المستلم يجب أن يكون موجبًا.').default(0),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const expenseSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  description: z.string().trim().min(1, "الوصف مطلوب."),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  paymentOrder: z.string().optional(),
  supplierName: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function AccountingDashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, expenses, addExpense, updateExpense, deleteExpense, loading } = useTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<PerformanceAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // States for controlling date picker popovers
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isExecDatePopoverOpen, setIsExecDatePopoverOpen] = useState(false);
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);
  const [isExpenseDatePopoverOpen, setIsExpenseDatePopoverOpen] = useState(false);
  const [isFilterDatePopoverOpen, setIsFilterDatePopoverOpen] = useState(false);
  
  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      executionDate: undefined,
      dueDate: undefined,
      supplierName: "",
      governorate: "",
      city: "",
      description: "اسمنت العريش",
      category: "",
      variety: "",
      quantity: 0,
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
      paymentOrder: "",
      supplierName: "",
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
        executionDate: transaction.executionDate ? new Date(transaction.executionDate) : undefined,
        dueDate: transaction.dueDate ? new Date(transaction.dueDate) : undefined,
      });
       if (transaction.governorate) {
        setAvailableCities(cities[transaction.governorate] || []);
      }
    } else {
      form.reset({
        date: new Date(),
        executionDate: undefined,
        dueDate: undefined,
        supplierName: "",
        governorate: "",
        city: "",
        description: "اسمنت العريش",
        category: "",
        variety: "",
        quantity: 0,
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
        paymentOrder: "",
        supplierName: "",
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
        const totalPurchasePrice = (values.quantity || 0) * (values.purchasePrice || 0);
        const totalSellingPrice = (values.quantity || 0) * (values.sellingPrice || 0);
        
        const profit =
            (values.sellingPrice || 0) > 0
                ? totalSellingPrice - totalPurchasePrice - (values.taxes || 0)
                : 0;

        const transactionData = {
          ...values,
          totalPurchasePrice,
          totalSellingPrice,
          profit,
          description: values.description || 'عملية غير محددة',
        };
        
        if (editingTransaction) {
            const updatedTransaction: Transaction = {
              ...editingTransaction,
              ...transactionData,
            };
            await updateTransaction(updatedTransaction);
            toast({
              title: "نجاح",
              description: "تم تعديل العملية بنجاح.",
              variant: "default"
            });
        } else {
            const newTransaction: Omit<Transaction, 'id'> = {
              ...transactionData,
            };
            await addTransaction(newTransaction as Transaction);
            toast({
              title: "نجاح",
              description: "تمت إضافة العملية بنجاح.",
              variant: "default"
            });
        }
        form.reset();
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error submitting form", error)
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

  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(transactionId);
  };
  
  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchMatch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.governorate && t.governorate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase()));
      const dateMatch = dateFilter ? format(t.date, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd') : true;
      return searchMatch && dateMatch;
    }).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchTerm, dateFilter]);
  
  const {
    totalSales,
    totalPurchases,
    profitFromTransactions,
    totalReceivedFromSuppliers,
    totalPaidToFactory,
  } = useMemo(() => {
    const aggregates = transactions.reduce(
      (acc, t) => {
        acc.totalSales += t.totalSellingPrice;
        acc.totalPurchases += t.totalPurchasePrice;
        acc.totalReceivedFromSuppliers += t.amountReceivedFromSupplier;
        acc.totalPaidToFactory += t.amountPaidToFactory;

        const isSold = t.totalSellingPrice > 0;
        if (isSold) {
          acc.costOfGoodsSold += t.totalPurchasePrice;
          acc.totalTaxesOnSoldItems += t.taxes;
        }
        return acc;
      },
      {
        totalSales: 0,
        totalPurchases: 0,
        costOfGoodsSold: 0,
        totalReceivedFromSuppliers: 0,
        totalPaidToFactory: 0,
        totalTaxesOnSoldItems: 0,
      }
    );

    const profitBeforeExpenses = aggregates.totalSales - aggregates.costOfGoodsSold - aggregates.totalTaxesOnSoldItems;

    return {
      totalSales: aggregates.totalSales,
      totalPurchases: aggregates.totalPurchases,
      totalReceivedFromSuppliers: aggregates.totalReceivedFromSuppliers,
      totalPaidToFactory: aggregates.totalPaidToFactory,
      profitFromTransactions: profitBeforeExpenses,
    };
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
    const headers = ["مسلسل", "التاريخ", "تاريخ التنفيذ", "تاريخ الاستحقاق", "اسم المورد", "المحافظة", "المركز", "الوصف", "الصنف", "النوع", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المدفوع للمصنع", "المستلم من المورد"];
    
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
        t.executionDate ? format(t.executionDate, 'yyyy-MM-dd') : '',
        t.dueDate ? format(t.dueDate, 'yyyy-MM-dd') : '',
        escapeCSV(t.supplierName),
        escapeCSV(t.governorate),
        escapeCSV(t.city),
        escapeCSV(t.description),
        escapeCSV(t.category),
        escapeCSV(t.variety),
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
    setAnalysis(null); // Clear previous analysis

    try {
      const analysisInput = {
        transactions: transactions.map(t => ({
          date: t.date.toISOString(),
          supplierName: t.supplierName,
          governorate: t.governorate || '',
          city: t.city || '',
          totalSellingPrice: t.totalSellingPrice,
          profit: t.profit,
        })),
        totalProfit: totalProfit,
        totalExpenses: totalExpenses,
      };

      const result: PerformanceAnalysisOutput = await analyzePerformance(analysisInput);
      if (result && result.analysis) {
        setAnalysis(result);
      } else {
        setAnalysis({ analysis: "لم يتمكن الذكاء الاصطناعي من إنشاء تحليل. قد تكون هناك مشكلة مؤقتة. يرجى المحاولة مرة أخرى لاحقًا." });
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: 'خطأ في التحليل',
        description: 'حدث خطأ أثناء توليد التحليل. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      setAnalysis({ analysis: "لم نتمكن من إتمام التحليل بسبب خطأ فني." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalPurchasePriceDisplay = (watchedValues.quantity || 0) * (watchedValues.purchasePrice || 0);
  const totalSellingPriceDisplay = (watchedValues.quantity || 0) * (watchedValues.sellingPrice || 0);
  const profitDisplay =
    (watchedValues.sellingPrice || 0) > 0
      ? totalSellingPriceDisplay - totalPurchasePriceDisplay - (watchedValues.taxes || 0)
      : 0;
  
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
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'تعديل عملية' : 'إضافة عملية جديدة'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
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
                                <Popover modal={false} open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
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
                                  <FormLabel>المحافظة (اختياري)</FormLabel>
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
                                  <Select onValueChange={field.onChange} value={field.value} disabled={!availableCities.length}>
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
                             <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>الوصف</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر وصف العملية" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {descriptionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
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
                      <AccordionTrigger>تفاصيل البضاعة والتسعير (اختياري)</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                           <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الصنف (اختياري)</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر الصنف" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categoryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="variety"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>النوع (اختياري)</FormLabel>
                                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر النوع" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {varietyOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
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
                                <Input type="number" value={totalPurchasePriceDisplay.toFixed(2)} readOnly className="font-bold bg-muted" />
                              </FormControl>
                            </FormItem>
                            <FormItem>
                              <FormLabel>إجمالي سعر البيع</FormLabel>
                              <FormControl>
                                <Input type="number" value={totalSellingPriceDisplay.toFixed(2)} readOnly className="font-bold bg-muted" />
                              </FormControl>
                            </FormItem>
                        </div>
                        <FormItem className="mt-4">
                            <FormLabel>صافي الربح</FormLabel>
                            <FormControl>
                              <Input type="number" value={profitDisplay.toFixed(2)} readOnly className={`font-bold ${profitDisplay >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`} />
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
                                <FormLabel>تاريخ التنفيذ (اختياري)</FormLabel>
                                <Popover modal={false} open={isExecDatePopoverOpen} onOpenChange={setIsExecDatePopoverOpen}>
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
                                <FormLabel>تاريخ الاستحقاق (اختياري)</FormLabel>
                                <Popover modal={false} open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}>
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
                    {editingTransaction && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="mr-auto">
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    حذف
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العملية بشكل دائم.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                        if (editingTransaction) {
                                            await handleDeleteTransaction(editingTransaction.id);
                                            setIsDialogOpen(false);
                                            setEditingTransaction(null);
                                        }
                                    }}>متابعة</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="submit">{editingTransaction ? 'حفظ التعديلات' : 'حفظ العملية'}</Button>
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
                        <Popover modal={false} open={isExpenseDatePopoverOpen} onOpenChange={setIsExpenseDatePopoverOpen}>
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
                        <FormLabel>الوصف / سبب الصرف</FormLabel>
                        <FormControl><Input placeholder="مثال: سحب أرباح" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={expenseForm.control}
                    name="paymentOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>أمر الصرف (اختياري)</FormLabel>
                        <FormControl><Input placeholder="رقم أمر الصرف" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={expenseForm.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>خصم من ربح المورد (اختياري)</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === '__general__' ? '' : value)}
                          value={field.value || '__general__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر موردًا لخصم المصروف من ربحه" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__general__">مصروف عام (لا يوجد مورد)</SelectItem>
                            {supplierNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستلم من الموردين</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{totalReceivedFromSuppliers.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوع للمصنع</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
          </CardContent>
        </Card>
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
                          <PopoverContent className="w-auto p-0" align="center">
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
                  <div className="relative w-full overflow-auto">
                      <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                          <TableHeader>
                          <TableRow>
                              <TableHead>م</TableHead>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>اسم المورد</TableHead>
                              <TableHead>الوصف</TableHead>
                              <TableHead>المنطقة</TableHead>
                              <TableHead>الكمية / التفاصيل</TableHead>
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
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(t)} className="text-muted-foreground hover:text-primary">
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">تعديل</span>
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">حذف</span>
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العملية بشكل دائم.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>متابعة</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
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
                  </div>
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.analysis}</ReactMarkdown>
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
               <div className="relative w-full overflow-auto">
                <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>المورد</TableHead>
                      <TableHead>أمر الصرف</TableHead>
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
                          <TableCell>{e.supplierName || '-'}</TableCell>
                          <TableCell>{e.paymentOrder || '-'}</TableCell>
                          <TableCell className="text-destructive">{e.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">لا توجد مصروفات.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
