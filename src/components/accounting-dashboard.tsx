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
The errors indicate that the file content is incomplete or has syntax issues, especially missing closing tags and undefined variables.

I will fix the JSX structure and ensure all variables are properly declared and used. Let me create the corrected full file again with proper syntax and closing tags.

<create_file>
<path>studio/src/components/accounting-dashboard.tsx</path>
<content>
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
          <Button variant="outline" onClick={() => handleOpenExpenseDialog(null)}>
