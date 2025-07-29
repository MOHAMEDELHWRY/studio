"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Label } from '@/components/ui/label';
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
import { type PerformanceAnalysisOutput } from '@/ai/flows/analyze-performance-flow';
import { descriptionOptions, categoryOptions, varietyOptions } from '@/data/transaction-data';

const transactionSchema = z.object({
  date: z.date({ required_error: 'التاريخ مطلوب.' }),
  executionDate: z.date().optional(),
  showExecutionDate: z.boolean().optional().default(false),
  dueDate: z.date().optional(),
  supplierName: z.string().trim().min(1, 'اسم المورد مطلوب.'),
  customerName: z.string().trim().optional(),
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
  const { 
    transactions, addTransaction, updateTransaction, deleteTransaction, 
    expenses, addExpense, updateExpense, deleteExpense, 
    loading 
  } = useTransactions();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [dateType, setDateType] = useState<'operation' | 'execution'>('operation');
  const [analysis, setAnalysis] = useState<PerformanceAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { date: new Date(), executionDate: undefined, dueDate: undefined, supplierName: "", customerName: "", governorate: "", city: "", description: "اسمنت العريش", category: "", variety: "", quantity: 0, purchasePrice: 0, sellingPrice: 0, taxes: 0, amountPaidToFactory: 0, amountReceivedFromSupplier: 0, showExecutionDate: false },
  });
  const { watch, setValue } = form;
  const watchedValues = watch();
  const selectedGovernorate = watch("governorate");

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date(), description: "", amount: 0, paymentOrder: "", supplierName: "" },
  });

  useEffect(() => {
    if (selectedGovernorate) {
      setAvailableCities(cities[selectedGovernorate] || []);
      setValue("city", "", { shouldValidate: false });
    } else {
      setAvailableCities([]);
    }
  }, [selectedGovernorate, setValue]);

  const handleOpenDialog = (transaction: Transaction | null = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      form.reset({
        date: transaction.date,
        executionDate: transaction.executionDate,
        dueDate: transaction.dueDate,
        showExecutionDate: !!transaction.executionDate,
        supplierName: transaction.supplierName,
        customerName: transaction.customerName || "",
        governorate: transaction.governorate || "",
        city: transaction.city || "",
        description: transaction.description,
        category: transaction.category || "",
        variety: transaction.variety || "",
        quantity: transaction.quantity,
        purchasePrice: transaction.purchasePrice,
        sellingPrice: transaction.sellingPrice,
        taxes: transaction.taxes,
        amountPaidToFactory: transaction.amountPaidToFactory,
        amountReceivedFromSupplier: transaction.amountReceivedFromSupplier,
      });
      if (transaction.governorate) {
        setAvailableCities(cities[transaction.governorate] || []);
      }
    } else {
      setEditingTransaction(null);
      form.reset({ 
        date: new Date(), 
        executionDate: undefined, 
        dueDate: undefined, 
        showExecutionDate: false,
        supplierName: "", 
        customerName: "", 
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
        amountReceivedFromSupplier: 0 
      });
      setAvailableCities([]);
    }
    setIsDialogOpen(true);
  };

  const handleOpenExpenseDialog = (expense: Expense | null = null) => {
    if (expense) {
      setEditingExpense(expense);
      expenseForm.reset({
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        paymentOrder: expense.paymentOrder || "",
        supplierName: expense.supplierName || "",
      });
    } else {
      setEditingExpense(null);
      expenseForm.reset({ 
        date: new Date(), 
        description: "", 
        amount: 0, 
        paymentOrder: "", 
        supplierName: "" 
      });
    }
    setIsExpenseDialogOpen(true);
  };

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      const transactionData = {
        ...data,
        description: data.description || "اسمنت العريش",
        totalPurchasePrice: data.quantity * data.purchasePrice,
        totalSellingPrice: data.sellingPrice > 0 ? data.quantity * data.sellingPrice : 0,
        profit: data.sellingPrice > 0 ? (data.quantity * data.sellingPrice) - (data.quantity * data.purchasePrice) - data.taxes : 0,
      };
      
      if (editingTransaction) {
        await updateTransaction({ ...transactionData, id: editingTransaction.id } as Transaction);
        toast({ title: "تم التحديث", description: "تم تحديث العملية بنجاح." });
      } else {
        await addTransaction(transactionData);
        toast({ title: "تم الإضافة", description: "تم إضافة العملية بنجاح." });
      }
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error submitting transaction: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حفظ العملية.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitExpense = async (data: ExpenseFormValues) => {
    setIsExpenseSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense({ ...data, id: editingExpense.id } as Expense);
        toast({ title: "تم التحديث", description: "تم تحديث المصروف بنجاح." });
      } else {
        await addExpense(data);
        toast({ title: "تم الإضافة", description: "تم إضافة المصروف بنجاح." });
      }
      expenseForm.reset();
      setIsExpenseDialogOpen(false);
    } catch(error) {
      console.error("Error submitting expense: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حفظ المصروف.", variant: "destructive" });
    } finally {
      setIsExpenseSubmitting(false);
    }
  };
  
  const handleDeleteTransaction = async (transactionId: string) => await deleteTransaction(transactionId);
  const handleDeleteExpense = async (expenseId: string) => await deleteExpense(expenseId);

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchMatch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.governorate && t.governorate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let dateMatch = true;
      
      if (startDate || endDate) {
        const targetDate = dateType === 'operation' ? t.date : (t.executionDate || t.date);
        
        if (startDate && endDate) {
          dateMatch = targetDate >= startDate && targetDate <= endDate;
        } else if (startDate) {
          dateMatch = targetDate >= startDate;
        } else if (endDate) {
          dateMatch = targetDate <= endDate;
        }
      }
      
      return searchMatch && dateMatch;
    }).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchTerm, startDate, endDate, dateType]);
  
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
          acc.totalTaxesOnSoldItems += t.taxes;
        } else {
          acc.remainingStockValue += t.totalPurchasePrice;
        }
        return acc;
      },
      { totalSales: 0, totalPurchases: 0, remainingStockValue: 0, totalReceivedFromSuppliers: 0, totalPaidToFactory: 0, totalTaxesOnSoldItems: 0 }
    );

    const costOfGoodsSold = aggregates.totalPurchases - aggregates.remainingStockValue;
    const profitBeforeExpenses = aggregates.totalSales - costOfGoodsSold - aggregates.totalTaxesOnSoldItems;

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
      if (!monthlyData[month]) monthlyData[month] = { profit: 0 };
      monthlyData[month].profit += t.profit;
    });
    return Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })).reverse();
  }, [filteredAndSortedTransactions]);
  
  const handleExport = () => {
    const headers = ["مسلسل", "التاريخ", "تاريخ التنفيذ", "تاريخ الاستحقاق", "اسم العميل", "اسم المورد", "المحافظة", "المركز", "الوصف", "الصنف", "النوع", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المدفوع للمصنع", "المستلم من العميل"];
    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return "";
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) return `"${string.replace(/"/g, '""')}"`;
      return string;
    };
    const rows = filteredAndSortedTransactions.map((t, index) => [
      filteredAndSortedTransactions.length - index,
      format(t.date, 'yyyy-MM-dd'), t.executionDate ? format(t.executionDate, 'yyyy-MM-dd') : '', t.dueDate ? format(t.dueDate, 'yyyy-MM-dd') : '',
      escapeCSV(t.customerName || ''), escapeCSV(t.supplierName), escapeCSV(t.governorate), escapeCSV(t.city), escapeCSV(t.description), escapeCSV(t.category), escapeCSV(t.variety),
      t.quantity, t.purchasePrice, t.totalPurchasePrice, t.sellingPrice, t.totalSellingPrice, t.taxes, t.profit,
      t.amountPaidToFactory, t.amountReceivedFromSupplier
    ].join(','));
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
      toast({ title: 'لا توجد بيانات كافية', description: 'يجب إضافة بعض العمليات أولاً قبل طلب التحليل.', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const analysisInput = {
        transactions: transactions.map(t => ({ 
          date: t.date.toISOString(), 
          customerName: t.customerName || '',
          supplierName: t.supplierName, 
          governorate: t.governorate || '', 
          city: t.city || '', 
          totalSellingPrice: t.totalSellingPrice, 
          profit: t.profit 
        })),
        totalProfit: totalProfit, 
        totalExpenses: totalExpenses,
      };

      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisInput),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: PerformanceAnalysisOutput = await response.json();
      setAnalysis(result && result.analysis ? result : { analysis: "لم يتمكن الذكاء الاصطناعي من إنشاء تحليل." });
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({ title: 'خطأ في التحليل', description: 'حدث خطأ أثناء توليد التحليل.', variant: 'destructive' });
      setAnalysis({ analysis: "لم نتمكن من إتمام التحليل بسبب خطأ فني. يرجى التأكد من إعدادات الذكاء الاصطناعي." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalPurchasePriceDisplay = (watchedValues.quantity || 0) * (watchedValues.purchasePrice || 0);
  const totalSellingPriceDisplay = (watchedValues.sellingPrice || 0) > 0 ? (watchedValues.quantity || 0) * (watchedValues.sellingPrice || 0) : 0;
  const profitDisplay = (watchedValues.sellingPrice || 0) > 0 ? totalSellingPriceDisplay - totalPurchasePriceDisplay - (watchedValues.taxes || 0) : 0;
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
        <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-2"> <SidebarTrigger /> <h1 className="text-3xl font-bold text-primary">لوحة التحكم</h1> </div>
          <div className="flex gap-2 flex-wrap justify-center"> <Skeleton className="h-10 w-36" /> <Skeleton className="h-10 w-36" /> <Skeleton className="h-10 w-36" /> </div>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2 rounded" /></CardContent></Card>
        </div>
        <div className="mb-8">
          <Card>
            <CardHeader> <Skeleton className="h-6 w-1/4 rounded" /> <div className="flex flex-col md:flex-row gap-2 mt-4"> <Skeleton className="h-10 flex-1 rounded" /> <Skeleton className="h-10 w-[240px] rounded" /> </div> </CardHeader>
            <CardContent> <div className="space-y-2"> <Skeleton className="h-12 w-full rounded" /> <Skeleton className="h-12 w-full rounded" /> <Skeleton className="h-12 w-full rounded" /> <Skeleton className="h-12 w-full rounded" /> </div> </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 py-2 md:px-2 md:py-4">
      <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-primary">لوحة التحكم</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={() => handleOpenDialog(null)}><Plus className="ml-2 h-4 w-4" />إضافة عملية</Button>
          <Button variant="outline" onClick={() => handleOpenExpenseDialog(null)}><Plus className="ml-2 h-4 w-4" />إضافة مصروف</Button>
          <Button variant="outline" onClick={handleExport}><Download className="ml-2 h-4 w-4" />تصدير</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales.toLocaleString('ar-EG')} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases.toLocaleString('ar-EG')} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitFromTransactions.toLocaleString('ar-EG')} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit.toLocaleString('ar-EG')} ج.م
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>الأداء المالي</CardTitle>
            <div className="flex flex-col md:flex-row gap-2 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP', { locale: ar }) : "من تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP', { locale: ar }) : "إلى تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={dateType} onValueChange={(value: 'operation' | 'execution') => setDateType(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="نوع التاريخ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operation">تاريخ العملية</SelectItem>
                    <SelectItem value="execution">تاريخ التنفيذ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'الربح']}
                    labelFormatter={(label) => `شهر: ${label}`}
                  />
                  <Bar dataKey="profit" fill="#8884d8" name="الربح" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>أحدث العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الربح</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.slice(0, 5).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{transaction.supplierName}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className={transaction.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {transaction.profit.toLocaleString('ar-EG')} ج.م
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف هذه العملية نهائياً. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أحدث المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 5).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(expense.date, 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenExpenseDialog(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف هذا المصروف نهائياً. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              تحليل الأداء المالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Button 
                  onClick={handleAnalyzePerformance} 
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? "جاري التحليل..." : "تحليل الأداء باستخدام الذكاء الاصطناعي"}
                </Button>
              </div>
              
              {analysis && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="analysis">
                    <AccordionTrigger>عرض التحليل</AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {analysis.analysis}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "تعديل عملية" : "إضافة عملية جديدة"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ar })
                              ) : (
                                <span>اختر تاريخ</span>
                              )}
                              <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={ar}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "اسمنت العريش"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الوصف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {descriptionOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصنف</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصنف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="
