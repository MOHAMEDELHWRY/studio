"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useTransactions } from '@/context/transactions-context';
import { useToast } from '@/hooks/use-toast';
import { type BalanceTransfer } from '@/types';

import {
  ArrowRightLeft,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Hash,
  DollarSign,
  Plus
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
import { Textarea } from '@/components/ui/textarea';

const transferSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  fromSupplier: z.string().min(1, "يجب اختيار المورد المحول منه."),
  toSupplier: z.string().min(1, "يجب اختيار المورد المحول إليه."),
  reason: z.string().trim().min(1, "يجب كتابة سبب التحويل."),
  method: z.string().trim().min(1, "يجب تحديد طريقة التحويل."),
  classification: z.string().min(1, "يجب تحديد تصنيف التحويل."),
}).refine(data => data.fromSupplier !== data.toSupplier, {
  message: "لا يمكن التحويل إلى نفس المورد.",
  path: ["toSupplier"],
});
type TransferFormValues = z.infer<typeof transferSchema>;

export default function TransfersReportPage() {
  const { transactions, balanceTransfers, addBalanceTransfer, updateBalanceTransfer, deleteBalanceTransfer } = useTransactions();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<BalanceTransfer | null>(null);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      fromSupplier: "",
      toSupplier: "",
      reason: "",
      method: "تحويل بنكي",
      classification: "تسوية رصيد مبيعات",
    },
  });
  
  const handleOpenDialog = (transfer: BalanceTransfer | null) => {
    setEditingTransfer(transfer);
    if (transfer) {
      form.reset({
        ...transfer,
        date: new Date(transfer.date),
      });
    } else {
      form.reset({
        date: new Date(),
        amount: 0,
        fromSupplier: "",
        toSupplier: "",
        reason: "",
        method: "تحويل بنكي",
        classification: "تسوية رصيد مبيعات",
      });
    }
    setIsDialogOpen(true);
  };
  
  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingTransfer(null);
    }
    setIsDialogOpen(open);
  };

  const onSubmit = async (values: TransferFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingTransfer) {
        await updateBalanceTransfer({ ...editingTransfer, ...values });
        toast({ title: "نجاح", description: "تم تعديل التحويل بنجاح." });
      } else {
        await addBalanceTransfer(values);
        toast({ title: "نجاح", description: "تم تسجيل التحويل بنجاح." });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingTransfer(null);
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast({ title: "خطأ", description: "فشل حفظ التحويل. يرجى المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transferId: string) => {
    await deleteBalanceTransfer(transferId);
  };

  const { totalAmount, transfersCount } = useMemo(() => {
    return {
      totalAmount: balanceTransfers.reduce((acc, t) => acc + t.amount, 0),
      transfersCount: balanceTransfers.length,
    }
  }, [balanceTransfers]);

  const sortedTransfers = useMemo(() => {
    return [...balanceTransfers].sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [balanceTransfers]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ArrowRightLeft className="w-8 h-8" />
            تقرير تحويلات الأرصدة
            </h1>
        </div>
        <Button onClick={() => handleOpenDialog(null)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة تحويل جديد
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ المحولة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {totalAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد التحويلات</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfersCount}</div>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingTransfer ? 'تعديل تحويل' : 'إضافة تحويل جديد'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>تاريخ التحويل</FormLabel><Popover modal={false} open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="ml-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="center"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePopoverOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="fromSupplier" render={({ field }) => (<FormItem><FormLabel>المورد المحول منه</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="toSupplier" render={({ field }) => (<FormItem><FormLabel>المورد المحول إليه</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="classification" render={({ field }) => (
                  <FormItem>
                      <FormLabel>تصنيف التحويل</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="تسوية رصيد مبيعات">تسوية رصيد مبيعات</SelectItem>
                              <SelectItem value="تسوية رصيد مصنع">تسوية رصيد مصنع</SelectItem>
                              <SelectItem value="تحويل عام">تحويل عام</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>المبلغ المحول</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="method" render={({ field }) => (<FormItem><FormLabel>طريقة التحويل</FormLabel><FormControl><Input placeholder="مثال: تحويل بنكي" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>السبب / البيان</FormLabel><FormControl><Textarea placeholder="اكتب سببًا واضحًا للتحويل..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="pt-4">
                 <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'جاري الحفظ...' : (editingTransfer ? 'حفظ التعديلات' : 'حفظ التحويل')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل تحويلات الأرصدة</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المحول منه</TableHead><TableHead>المحول إليه</TableHead><TableHead>المبلغ</TableHead><TableHead>التصنيف</TableHead><TableHead>السبب</TableHead><TableHead>الطريقة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {sortedTransfers.length > 0 ? (
                  sortedTransfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell className="font-medium text-destructive">{t.fromSupplier}</TableCell>
                      <TableCell className="font-medium text-success">{t.toSupplier}</TableCell>
                      <TableCell className="font-bold">{t.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                      <TableCell>{t.classification}</TableCell>
                      <TableCell>{t.reason}</TableCell>
                      <TableCell>{t.method}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(t)} className="text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /><span className="sr-only">حذف</span></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيحذف التحويل بشكل دائم ولا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>متابعة</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">لا توجد تحويلات مسجلة.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
