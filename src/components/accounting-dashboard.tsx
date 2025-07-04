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
  ArrowRightLeft,
  File as FileIcon
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { type Transaction, type Expense, type BalanceTransfer, type SupplierPayment } from '@/types';
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
import { analyzePerformance, type PerformanceAnalysisOutput } from '@/ai/flows/analyze-performance-flow';
import { descriptionOptions, categoryOptions, varietyOptions } from '@/data/transaction-data';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

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

const paymentSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  supplierName: z.string().min(1, "يجب اختيار المورد."),
  method: z.enum(['نقدي', 'بنكي'], { required_error: "طريقة التحويل مطلوبة." }),
  sourceBank: z.string().optional(),
  destinationBank: z.string().optional(),
  reason: z.string().trim().min(1, "يجب كتابة سبب الصرف."),
  responsiblePerson: z.string().trim().min(1, "يجب تحديد القائم بالتحويل."),
  document: z.instanceof(FileList).optional(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function AccountingDashboard() {
  const { 
    transactions, addTransaction, updateTransaction, deleteTransaction, 
    expenses, addExpense, updateExpense, deleteExpense, 
    balanceTransfers, addBalanceTransfer,
    supplierPayments, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment,
    loading 
  } = useTransactions();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [analysis, setAnalysis] = useState<PerformanceAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);

  // Popover states
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isExecDatePopoverOpen, setIsExecDatePopoverOpen] = useState(false);
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);
  const [isExpenseDatePopoverOpen, setIsExpenseDatePopoverOpen] = useState(false);
  const [isFilterDatePopoverOpen, setIsFilterDatePopoverOpen] = useState(false);
  const [isTransferDatePopoverOpen, setIsTransferDatePopoverOpen] = useState(false);
  const [isPaymentDatePopoverOpen, setIsPaymentDatePopoverOpen] = useState(false);
  
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);

  // Transaction Form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { date: new Date(), executionDate: undefined, dueDate: undefined, supplierName: "", governorate: "", city: "", description: "اسمنت العريش", category: "", variety: "", quantity: 0, purchasePrice: 0, sellingPrice: 0, taxes: 0, amountPaidToFactory: 0, amountReceivedFromSupplier: 0 },
  });
  const { watch, setValue } = form;
  const watchedValues = watch();
  const selectedGovernorate = watch("governorate");

  // Expense Form
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date(), description: "", amount: 0, paymentOrder: "", supplierName: "" },
  });

  // Transfer Form
  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { date: new Date(), amount: 0, fromSupplier: "", toSupplier: "", reason: "", method: "تحويل بنكي" },
  });
  
  // Payment Form
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: new Date(), amount: 0, supplierName: "", method: 'نقدي', reason: "", responsiblePerson: "" },
  });
  const paymentMethodWatcher = paymentForm.watch('method');
  const paymentDocumentWatcher = paymentForm.watch('document');


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
      form.reset({ ...transaction, date: new Date(transaction.date), executionDate: transaction.executionDate ? new Date(transaction.executionDate) : undefined, dueDate: transaction.dueDate ? new Date(transaction.dueDate) : undefined });
       if (transaction.governorate) setAvailableCities(cities[transaction.governorate] || []);
    } else {
      form.reset({ date: new Date(), executionDate: undefined, dueDate: undefined, supplierName: "", governorate: "", city: "", description: "اسمنت العريش", category: "", variety: "", quantity: 0, purchasePrice: 0, sellingPrice: 0, taxes: 0, amountPaidToFactory: 0, amountReceivedFromSupplier: 0 });
    }
    setIsDialogOpen(true);
  };
  
  const handleOpenExpenseDialog = (expense: Expense | null) => {
    setEditingExpense(expense);
    if (expense) {
      expenseForm.reset({ ...expense, date: new Date(expense.date) });
    } else {
      expenseForm.reset({ date: new Date(), description: "", amount: 0, paymentOrder: "", supplierName: "" });
    }
    setIsExpenseDialogOpen(true);
  };
  
  const handleOpenPaymentDialog = (payment: SupplierPayment | null) => {
    setEditingPayment(payment);
    if (payment) {
      paymentForm.reset({ ...payment, date: new Date(payment.date) });
    } else {
      paymentForm.reset({ date: new Date(), amount: 0, supplierName: "", method: 'نقدي', reason: "", responsiblePerson: "" });
    }
    setIsPaymentDialogOpen(true);
  };
  
  const onExpenseDialogOpenChange = (open: boolean) => {
    if (!open) setEditingExpense(null);
    setIsExpenseDialogOpen(open);
  };

  const onDialogOpenChange = (open: boolean) => {
    if (!open) setEditingTransaction(null);
    setIsDialogOpen(open);
  };

  const onSubmit = async (values: TransactionFormValues) => {
    try {
        const totalPurchasePrice = (values.quantity || 0) * (values.purchasePrice || 0);
        const totalSellingPrice = (values.sellingPrice || 0) > 0 ? (values.quantity || 0) * (values.sellingPrice || 0) : 0;
        
        const profit =
            (values.sellingPrice || 0) > 0
                ? totalSellingPrice - totalPurchasePrice - (values.taxes || 0)
                : 0;

        const transactionData = { ...values, totalPurchasePrice, totalSellingPrice, profit, description: values.description || 'عملية غير محددة' };
        
        if (editingTransaction) {
            await updateTransaction({ ...editingTransaction, ...transactionData });
            toast({ title: "نجاح", description: "تم تعديل العملية بنجاح." });
        } else {
            await addTransaction(transactionData as Transaction);
            toast({ title: "نجاح", description: "تمت إضافة العملية بنجاح." });
        }
        form.reset();
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error submitting form", error)
        toast({ title: "خطأ في الإدخال", description: "حدث خطأ أثناء حفظ العملية.", variant: "destructive" });
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

  const onSubmitTransfer = async (values: TransferFormValues) => {
    await addBalanceTransfer(values);
    transferForm.reset();
    setIsTransferDialogOpen(false);
    toast({ title: "نجاح", description: "تم تسجيل التحويل بنجاح." });
  };
  
  const onSubmitPayment = async (values: PaymentFormValues) => {
    const documentFile = values.document?.[0];
    if (editingPayment) {
        const updatedPaymentData: SupplierPayment = { ...editingPayment, ...values, documentUrl: editingPayment.documentUrl };
        await updateSupplierPayment(updatedPaymentData, documentFile);
    } else {
      const newPaymentData: Omit<SupplierPayment, 'id'> = { ...values, documentUrl: '' };
      await addSupplierPayment(newPaymentData, documentFile);
    }

    paymentForm.reset();
    setIsPaymentDialogOpen(false);
    setEditingPayment(null);
  };
  
  const handleDeleteTransaction = async (transactionId: string) => await deleteTransaction(transactionId);
  const handleDeleteExpense = async (expenseId: string) => await deleteExpense(expenseId);
  const handleDeletePayment = async (paymentId: string) => await deleteSupplierPayment(paymentId);


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

  const sortedPayments = useMemo(() => [...supplierPayments].sort((a,b) => b.date.getTime() - a.date.getTime()), [supplierPayments]);
  const sortedTransfers = useMemo(() => [...balanceTransfers].sort((a,b) => b.date.getTime() - a.date.getTime()), [balanceTransfers]);


  const handleExport = () => {
    const headers = ["مسلسل", "التاريخ", "تاريخ التنفيذ", "تاريخ الاستحقاق", "اسم المورد", "المحافظة", "المركز", "الوصف", "الصنف", "النوع", "الكمية", "سعر الشراء", "إجمالي الشراء", "سعر البيع", "إجمالي البيع", "الضرائب", "الربح", "المدفوع للمصنع", "المستلم من المورد"];
    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return "";
      const string = String(str);
      if (string.search(/("|,|\n)/g) >= 0) return `"${string.replace(/"/g, '""')}"`;
      return string;
    };
    const rows = filteredAndSortedTransactions.map((t, index) => [
      filteredAndSortedTransactions.length - index,
      format(t.date, 'yyyy-MM-dd'), t.executionDate ? format(t.executionDate, 'yyyy-MM-dd') : '', t.dueDate ? format(t.dueDate, 'yyyy-MM-dd') : '',
      escapeCSV(t.supplierName), escapeCSV(t.governorate), escapeCSV(t.city), escapeCSV(t.description), escapeCSV(t.category), escapeCSV(t.variety),
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
        transactions: transactions.map(t => ({ date: t.date.toISOString(), supplierName: t.supplierName, governorate: t.governorate || '', city: t.city || '', totalSellingPrice: t.totalSellingPrice, profit: t.profit })),
        totalProfit: totalProfit, totalExpenses: totalExpenses,
      };
      const result: PerformanceAnalysisOutput = await analyzePerformance(analysisInput);
      setAnalysis(result && result.analysis ? result : { analysis: "لم يتمكن الذكاء الاصطناعي من إنشاء تحليل." });
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({ title: 'خطأ في التحليل', description: 'حدث خطأ أثناء توليد التحليل.', variant: 'destructive' });
      setAnalysis({ analysis: "لم نتمكن من إتمام التحليل بسبب خطأ فني." });
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
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-2"> <SidebarTrigger /> <h1 className="text-3xl font-bold text-primary"> لوحة التحكم </h1> </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button onClick={() => handleOpenDialog(null)}> <Plus className="ml-2 h-4 w-4" /> إضافة عملية </Button>
          <Button variant="outline" onClick={() => handleOpenExpenseDialog(null)}> <MinusCircle className="ml-2 h-4 w-4" /> إضافة مصروف </Button>
          <Button variant="outline" onClick={handleExport}> <Download className="ml-2 h-4 w-4" /> تصدير CSV </Button>
          <Button variant="outline" onClick={() => handleOpenPaymentDialog(null)}> <Landmark className="ml-2 h-4 w-4" /> تسجيل دفعة </Button>
          <Button onClick={() => setIsTransferDialogOpen(true)}> <ArrowRightLeft className="ml-2 h-4 w-4" /> تحويل رصيد </Button>
        </div>
      </header>

       <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader> <DialogTitle>{editingTransaction ? 'تعديل عملية' : 'إضافة عملية جديدة'}</DialogTitle> </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
                  <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>المعلومات الأساسية</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <FormField control={form.control} name="supplierName" render={({ field }) => ( <FormItem> <FormLabel>اسم المورد</FormLabel> <FormControl> <Input placeholder="اسم المورد" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>تاريخ العملية</FormLabel> <Popover modal={false} open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="ml-2 h-4 w-4" /> {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="center"> <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDatePopoverOpen(false); }} disabled={(date) => date > new Date()} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="governorate" render={({ field }) => ( <FormItem> <FormLabel>المحافظة (اختياري)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر المحافظة" /> </SelectTrigger> </FormControl> <SelectContent> {governorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>المركز (اختياري)</FormLabel> <Select onValueChange={field.onChange} value={field.value} disabled={!availableCities.length}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر المركز" /> </SelectTrigger> </FormControl> <SelectContent> {availableCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="description" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>الوصف</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر وصف العملية" /> </SelectTrigger> </FormControl> <SelectContent> {descriptionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>تفاصيل البضاعة والتسعير (اختياري)</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                           <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>الصنف (اختياري)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر الصنف" /> </SelectTrigger> </FormControl> <SelectContent> {categoryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                           <FormField control={form.control} name="variety" render={({ field }) => ( <FormItem> <FormLabel>النوع (اختياري)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر النوع" /> </SelectTrigger> </FormControl> <SelectContent> {varietyOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem> <FormLabel>الكمية</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                           <FormField control={form.control} name="taxes" render={({ field }) => ( <FormItem> <FormLabel>الضرائب</FormLabel> <FormControl> <Input type="number" placeholder="0" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem> <FormLabel>سعر الشراء</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="sellingPrice" render={({ field }) => ( <FormItem> <FormLabel>سعر البيع</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                           <FormItem>
                             <Label>إجمالي سعر الشراء</Label>
                             <Input type="number" value={totalPurchasePriceDisplay.toFixed(2)} readOnly className="font-bold bg-muted" />
                           </FormItem>
                           <FormItem>
                             <Label>إجمالي سعر البيع</Label>
                             <Input type="number" value={totalSellingPriceDisplay.toFixed(2)} readOnly className="font-bold bg-muted" />
                           </FormItem>
                        </div>
                        <FormItem className="mt-4">
                           <Label>صافي الربح</Label>
                           <Input type="number" value={profitDisplay.toFixed(2)} readOnly className={`font-bold ${profitDisplay >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`} />
                        </FormItem>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>المدفوعات والتواريخ الهامة</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <FormField control={form.control} name="amountPaidToFactory" render={({ field }) => ( <FormItem> <FormLabel>المبلغ المدفوع للمصنع</FormLabel> <FormControl> <Input type="number" placeholder="0" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="amountReceivedFromSupplier" render={({ field }) => ( <FormItem> <FormLabel>المبلغ المستلم من المورد</FormLabel> <FormControl> <Input type="number" placeholder="0" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="executionDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>تاريخ التنفيذ (اختياري)</FormLabel> <Popover modal={false} open={isExecDatePopoverOpen} onOpenChange={setIsExecDatePopoverOpen}> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="ml-2 h-4 w-4" /> {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="center"> <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsExecDatePopoverOpen(false); }} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
                          <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>تاريخ الاستحقاق (اختياري)</FormLabel> <Popover modal={false} open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="ml-2 h-4 w-4" /> {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="center"> <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDueDatePopoverOpen(false); }} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <DialogFooter className="pt-4">
                    {editingTransaction && ( <AlertDialog> <AlertDialogTrigger asChild> <Button type="button" variant="destructive" className="mr-auto"> <Trash2 className="ml-2 h-4 w-4" /> حذف </Button> </AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle> <AlertDialogDescription> هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العملية بشكل دائم. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>إلغاء</AlertDialogCancel> <AlertDialogAction onClick={async () => { if (editingTransaction) { await handleDeleteTransaction(editingTransaction.id); setIsDialogOpen(false); setEditingTransaction(null); } }}>متابعة</AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> )}
                    <DialogClose asChild> <Button type="button" variant="secondary">إلغاء</Button> </DialogClose>
                    <Button type="submit">{editingTransaction ? 'حفظ التعديلات' : 'حفظ العملية'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
           <Dialog open={isExpenseDialogOpen} onOpenChange={onExpenseDialogOpenChange}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader> <DialogTitle>{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</DialogTitle> </DialogHeader>
              <Form {...expenseForm}>
                <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="grid gap-4 py-4">
                  <FormField control={expenseForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>تاريخ المصروف</FormLabel> <Popover modal={false} open={isExpenseDatePopoverOpen} onOpenChange={setIsExpenseDatePopoverOpen}> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="ml-2 h-4 w-4" /> {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="center"> <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsExpenseDatePopoverOpen(false); }} disabled={(date) => date > new Date()} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
                  <FormField control={expenseForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>الوصف / سبب الصرف</FormLabel> <FormControl><Input placeholder="مثال: سحب أرباح" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={expenseForm.control} name="paymentOrder" render={({ field }) => ( <FormItem> <FormLabel>أمر الصرف (اختياري)</FormLabel> <FormControl><Input placeholder="رقم أمر الصرف" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={expenseForm.control} name="supplierName" render={({ field }) => ( <FormItem> <FormLabel>خصم من ربح المورد (اختياري)</FormLabel> <Select onValueChange={(value) => field.onChange(value === '__general__' ? '' : value)} value={field.value || '__general__'}> <FormControl> <SelectTrigger> <SelectValue placeholder="اختر موردًا لخصم المصروف من ربحه" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="__general__">مصروف عام (لا يوجد مورد)</SelectItem> {supplierNames.map((name) => ( <SelectItem key={name} value={name}> {name} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  <FormField control={expenseForm.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>المبلغ</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <DialogFooter> <Button type="submit">حفظ المصروف</Button> <DialogClose asChild> <Button type="button" variant="secondary">إلغاء</Button> </DialogClose> </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>{editingPayment ? 'تعديل دفعة لمورد' : 'تسجيل دفعة لمورد'}</DialogTitle></DialogHeader>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={paymentForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>تاريخ الصرف</FormLabel><Popover modal={false} open={isPaymentDatePopoverOpen} onOpenChange={setIsPaymentDatePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="ml-2 h-4 w-4"/>{field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="center"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsPaymentDatePopoverOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={paymentForm.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel>اسم المورد</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={paymentForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>المبلغ المصروف</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={paymentForm.control} name="responsiblePerson" render={({ field }) => (<FormItem><FormLabel>القائم بالتحويل</FormLabel><FormControl><Input placeholder="اسم المسؤول" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={paymentForm.control} name="method" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>طريقة التحويل</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="نقدي" /></FormControl><FormLabel className="font-normal">نقدي</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="بنكي" /></FormControl><FormLabel className="font-normal">بنكي</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                  {paymentMethodWatcher === 'بنكي' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md"><FormField control={paymentForm.control} name="sourceBank" render={({ field }) => (<FormItem><FormLabel>البنك المحول منه</FormLabel><FormControl><Input placeholder="حساب الشركة" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /><FormField control={paymentForm.control} name="destinationBank" render={({ field }) => (<FormItem><FormLabel>البنك المحول إليه</FormLabel><FormControl><Input placeholder="بنك المورد" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></div>)}
                  <FormField control={paymentForm.control} name="reason" render={({ field }) => (<FormItem><FormLabel>السبب / البيان</FormLabel><FormControl><Textarea placeholder="اكتب سببًا واضحًا للصرف..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={paymentForm.control} name="document" render={({ field: { onChange, ...rest } }) => (<FormItem><FormLabel>رفع مستند التحويل (اختياري)</FormLabel><FormControl><Input type="file" onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl><FormMessage /></FormItem>)} />
                  {editingPayment?.documentUrl && !paymentDocumentWatcher?.length && (<div className="text-sm"><span className="font-medium">المستند الحالي: </span><a href={editingPayment.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">عرض المستند</a><p className="text-xs text-muted-foreground">للتغيير، قم برفع ملف جديد.</p></div>)}
                  <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose><Button type="submit">{editingPayment ? 'حفظ التعديلات' : 'تسجيل الدفعة'}</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>تحويل رصيد بين الموردين</DialogTitle></DialogHeader>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(onSubmitTransfer)} className="grid gap-4 py-4">
                  <FormField control={transferForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>تاريخ التحويل</FormLabel> <Popover modal={false} open={isTransferDatePopoverOpen} onOpenChange={setIsTransferDatePopoverOpen}> <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="ml-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>} </Button></FormControl></PopoverTrigger> <PopoverContent className="w-auto p-0" align="center"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsTransferDatePopoverOpen(false); }} initialFocus /></PopoverContent> </Popover><FormMessage /> </FormItem>)} />
                  <FormField control={transferForm.control} name="fromSupplier" render={({ field }) => ( <FormItem><FormLabel>المورد المحول منه</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={transferForm.control} name="toSupplier" render={({ field }) => ( <FormItem><FormLabel>المورد المحول إليه</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={transferForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>المبلغ المحول</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={transferForm.control} name="method" render={({ field }) => (<FormItem><FormLabel>طريقة التحويل</FormLabel><FormControl><Input placeholder="مثال: تحويل بنكي" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={transferForm.control} name="reason" render={({ field }) => (<FormItem><FormLabel>السبب / البيان</FormLabel><FormControl><Textarea placeholder="اكتب سببًا واضحًا للتحويل..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose><Button type="submit">حفظ التحويل</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">إجمالي المستلم من الموردين</CardTitle> <Landmark className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold text-success">{totalReceivedFromSuppliers.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div> </CardContent> </Card>
        <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">إجمالي المدفوع للمصنع</CardTitle> <Factory className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold text-primary">{totalPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div> </CardContent> </Card>
        <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle> <ShoppingCart className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">{totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div> </CardContent> </Card>
        <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle> <DollarSign className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">{totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div> </CardContent> </Card>
        <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">صافي الربح (بعد المصروفات)</CardTitle> <LineChart className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}> {totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })} </div> <p className="text-xs text-muted-foreground"> الربح {profitFromTransactions.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})} - المصروفات {totalExpenses.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})} </p> </CardContent> </Card>
      </div>
      
      <div className="mb-8">
          <Card>
              <CardHeader>
                  <CardTitle>سجل العمليات</CardTitle>
                  <div className="flex flex-col md:flex-row gap-2 mt-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="بحث بالوصف أو اسم المورد..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover open={isFilterDatePopoverOpen} onOpenChange={setIsFilterDatePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full md:w-[240px] justify-start text-right font-normal", !dateFilter && "text-muted-foreground")}>
                              <CalendarIcon className="ml-2 h-4 w-4" />
                              {dateFilter ? format(dateFilter, "PPP", { locale: ar }) : <span>فلترة بالتاريخ</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <Calendar mode="single" selected={dateFilter} onSelect={(date) => { setDateFilter(date); setIsFilterDatePopoverOpen(false); }} initialFocus />
                          </PopoverContent>
                        </Popover>
                        {dateFilter && <Button variant="ghost" onClick={() => setDateFilter(undefined)}>مسح الفلتر</Button>}
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="relative w-full overflow-auto">
                      <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                          <TableHeader><TableRow><TableHead>م</TableHead><TableHead>التاريخ</TableHead><TableHead>اسم المورد</TableHead><TableHead>الوصف</TableHead><TableHead>المنطقة</TableHead><TableHead>الكمية / التفاصيل</TableHead><TableHead>إجمالي الشراء</TableHead><TableHead>إجمالي البيع</TableHead><TableHead>صافي الربح</TableHead><TableHead>المدفوع للمصنع</TableHead><TableHead>المستلم من المورد</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
                          <TableBody>{filteredAndSortedTransactions.length > 0 ? ( filteredAndSortedTransactions.map((t, index) => ( <TableRow key={t.id}><TableCell>{filteredAndSortedTransactions.length - index}</TableCell><TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell><TableCell><Link href={`/supplier/${encodeURIComponent(t.supplierName)}`} className="font-medium text-primary hover:underline">{t.supplierName}</Link></TableCell><TableCell>{t.description}</TableCell><TableCell>{[t.governorate, t.city].filter(Boolean).join(' - ')}</TableCell><TableCell>{`${t.quantity.toLocaleString('ar-EG')} طن`}{(t.category || t.variety) && ( <span className="text-muted-foreground text-xs mx-1">({[t.category, t.variety].filter(Boolean).join(' / ')})</span> )}</TableCell><TableCell>{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell><TableCell>{t.totalSellingPrice > 0 ? ( t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) ) : ( <span className="text-muted-foreground">لم يتم البيع</span> )}</TableCell><TableCell className={`font-bold ${t.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{t.totalSellingPrice > 0 ? ( t.profit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) ) : ( <span className="text-muted-foreground">-</span> )}</TableCell><TableCell className="text-primary">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell><TableCell className="text-success">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell><TableCell><div className="flex items-center"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(t)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /><span className="sr-only">تعديل</span></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /><span className="sr-only">حذف</span></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العملية بشكل دائم.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>متابعة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow> )) ) : ( <TableRow><TableCell colSpan={12} className="h-24 text-center">لا توجد عمليات لعرضها.</TableCell></TableRow> )}</TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="lg:col-span-1">
           <Card className="h-full flex flex-col">
              <CardHeader> <CardTitle className="flex items-center gap-2"><LineChart/> ملخص الربح الشهري</CardTitle> </CardHeader>
              <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} />
                      <YAxis width={80} tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact' }).format(value as number)} />
                      <Tooltip formatter={(value) => [(value as number).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }), 'صافي الربح']} cursor={{fill: 'hsl(var(--muted))'}} />
                      <Bar dataKey="profit" fill="hsl(var(--primary))" name="الربح" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
              </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-8">
           <Card className="flex-1 flex flex-col">
              <CardHeader> <CardTitle className="flex items-center gap-2"><Wand2/> تحليل مالي بالذكاء الاصطناعي</CardTitle> </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                  {isAnalyzing ? ( <div className="space-y-4 flex-grow p-4 text-center flex flex-col justify-center"> <p className="text-sm text-muted-foreground">جاري تحليل البيانات...</p> <Skeleton className="h-4 w-5/6 mx-auto" /> <Skeleton className="h-4 w-full mx-auto" /> <Skeleton className="h-4 w-4/6 mx-auto" /> </div> ) : analysis ? ( <div className="prose prose-sm dark:prose-invert max-w-none text-right text-sm h-64 overflow-y-auto"> <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.analysis}</ReactMarkdown> </div> ) : ( <div className="text-center text-muted-foreground flex-grow flex flex-col justify-center items-center gap-4"> <p className="text-sm">احصل على رؤى حول أدائك المالي.</p> <Button onClick={handleAnalyzePerformance} disabled={isAnalyzing}> <Wand2 className="ml-2 h-4 w-4" /> {isAnalyzing ? "جاري التحليل..." : "توليد التحليل"} </Button> </div> )}
              </CardContent>
               {transactions.length > 0 && !analysis && !isAnalyzing && ( <CardFooter> <p className="text-xs text-muted-foreground w-full text-center"> يتم إنشاء التحليل بناءً على البيانات الحالية. </p> </CardFooter> )}
            </Card>
        </div>
      </div>

       <div className="grid grid-cols-1 gap-8 mt-8">
          <Card>
            <CardHeader> <CardTitle className="flex items-center gap-2"><Wallet/> سجل المصروفات</CardTitle> </CardHeader>
            <CardContent>
               <div className="relative w-full overflow-auto max-h-96">
                <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الوصف</TableHead><TableHead>المورد</TableHead><TableHead>أمر الصرف</TableHead><TableHead>المبلغ</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
                  <TableBody>{expenses.length > 0 ? ( expenses.map(e => ( <TableRow key={e.id}><TableCell>{format(e.date, 'dd-MM-yy')}</TableCell><TableCell>{e.description}</TableCell><TableCell>{e.supplierName || '-'}</TableCell><TableCell>{e.paymentOrder || '-'}</TableCell><TableCell className="text-destructive">{e.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell><TableCell><div className="flex items-center"><Button variant="ghost" size="icon" onClick={() => handleOpenExpenseDialog(e)}><Pencil className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيحذف المصروف بشكل دائم ولا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(e.id)}>متابعة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow> )) ) : ( <TableRow><TableCell colSpan={6} className="h-24 text-center">لا توجد مصروفات.</TableCell></TableRow> )}</TableBody>
                </Table>
               </div>
            </CardContent>
          </Card>
          
          {sortedPayments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>سجل الدفعات للموردين</CardTitle></CardHeader>
              <CardContent>
                <div className="relative w-full overflow-auto max-h-96">
                  <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المورد</TableHead><TableHead>المبلغ</TableHead><TableHead>الطريقة</TableHead><TableHead>السبب</TableHead><TableHead>المسؤول</TableHead><TableHead>المستند</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
                    <TableBody>{sortedPayments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{format(new Date(p.date), 'dd MMMM yyyy', { locale: ar })}</TableCell>
                          <TableCell className="font-medium">{p.supplierName}</TableCell>
                          <TableCell className="font-bold text-destructive">{p.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell>{p.reason}</TableCell>
                          <TableCell>{p.responsiblePerson}</TableCell>
                          <TableCell>{p.documentUrl ? ( <Button asChild variant="link" className="p-0 h-auto"><a href={p.documentUrl} target="_blank" rel="noopener noreferrer"><FileIcon className="w-4 h-4" /></a></Button> ) : ( '-' )}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenPaymentDialog(p)} title="تعديل الدفعة"><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="حذف الدفعة"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذه الدفعة ومستندها المرفق بشكل دائم.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePayment(p.id)}>متابعة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}</TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {sortedTransfers.length > 0 && (
            <Card>
              <CardHeader><CardTitle>سجل تحويلات الأرصدة</CardTitle></CardHeader>
              <CardContent>
                <div className="relative w-full overflow-auto max-h-96">
                  <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المحول منه</TableHead><TableHead>المحول إليه</TableHead><TableHead>المبلغ</TableHead><TableHead>السبب</TableHead><TableHead>الطريقة</TableHead></TableRow></TableHeader>
                    <TableBody>{sortedTransfers.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{format(new Date(t.date), 'dd MMMM yyyy', { locale: ar })}</TableCell>
                          <TableCell className="font-medium text-destructive">{t.fromSupplier}</TableCell>
                          <TableCell className="font-medium text-success">{t.toSupplier}</TableCell>
                          <TableCell className="font-bold">{t.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                          <TableCell>{t.reason}</TableCell>
                          <TableCell>{t.method}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
       </div>
    </div>
  );
}
