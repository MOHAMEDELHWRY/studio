"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useTransactions } from '@/context/transactions-context';
import { useToast } from '@/hooks/use-toast';
import { type Expense } from '@/types';

import {
  Wallet,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Hash
} from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SidebarTrigger } from '@/components/ui/sidebar';

const expenseSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  description: z.string().trim().min(1, "الوصف مطلوب."),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  paymentOrder: z.string().optional(),
  supplierName: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpensesReportPage() {
  const { transactions, expenses, updateExpense, deleteExpense } = useTransactions();
  const { toast } = useToast();

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExpenseDatePopoverOpen, setIsExpenseDatePopoverOpen] = useState(false);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);
  
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

  const onSubmitExpense = async (values: ExpenseFormValues) => {
    if (editingExpense) {
      await updateExpense({ ...editingExpense, ...values });
      toast({ title: "نجاح", description: "تم تعديل المصروف بنجاح." });
    }
    expenseForm.reset();
    setIsExpenseDialogOpen(false);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  const { totalExpensesAmount, expensesCount } = useMemo(() => {
    return {
      totalExpensesAmount: expenses.reduce((acc, e) => acc + e.amount, 0),
      expensesCount: expenses.length,
    }
  }, [expenses]);

  const sortedExpenses = useMemo(() => {
      return [...expenses].sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [expenses]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center mb-8 gap-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Wallet className="w-8 h-8" />
          تقرير المصروفات
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
                {totalExpensesAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد بنود المصروفات</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expensesCount}</div>
          </CardContent>
        </Card>
      </div>
      
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
                  <DialogFooter className="pt-4">
                     <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="submit">حفظ التعديلات</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المورد المرتبط</TableHead>
                  <TableHead>أمر الصرف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.length > 0 ? (
                  sortedExpenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{format(e.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{e.supplierName || 'عام'}</TableCell>
                      <TableCell>{e.paymentOrder || '-'}</TableCell>
                      <TableCell className="font-bold text-destructive">{e.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenExpenseDialog(e)} className="text-muted-foreground hover:text-primary">
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
                    <TableCell colSpan={6} className="h-24 text-center">
                      لا توجد مصروفات مسجلة.
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
