
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useTransactions } from '@/context/transactions-context';
import { useToast } from '@/hooks/use-toast';
import { type SupplierPayment } from '@/types';

import {
  Landmark,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Hash,
  DollarSign,
  Plus,
  Paperclip,
  File as FileIcon,
  X,
  Loader2,
  AlertCircle
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// We make documentUrl optional in the form, but required in the type
const paymentSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب." }),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر."),
  supplierName: z.string().min(1, "يجب اختيار المورد."),
  method: z.enum(['نقدي', 'بنكي'], { required_error: "طريقة التحويل مطلوبة." }),
  classification: z.enum(['دفعة من رصيد المبيعات', 'سحب أرباح للمورد', 'سداد للمصنع عن المورد', 'استعادة مبلغ كتسوية', 'سحب مبلغ كتسوية'], { required_error: "يجب تحديد تصنيف الدفعة." }),
  sourceBank: z.string().optional(),
  destinationBank: z.string().optional(),
  reason: z.string().trim().min(1, "يجب كتابة سبب الصرف."),
  responsiblePerson: z.string().trim().min(1, "يجب تحديد القائم بالتحويل."),
  documentUrl: z.string().optional(), // This will be handled separately
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentsReportPage() {
  const { transactions, supplierPayments, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment } = useTransactions();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);


  const supplierNames = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.supplierName))).sort();
  }, [transactions]);
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      supplierName: "",
      method: 'نقدي',
      classification: 'دفعة من رصيد المبيعات',
      reason: "",
      responsiblePerson: "",
      sourceBank: "",
      destinationBank: "",
    },
  });
  const paymentMethodWatcher = form.watch('method');
  
  const handleOpenDialog = (payment: SupplierPayment | null) => {
    setEditingPayment(payment);
    setSelectedFile(null);
    setUploadError(null);

    if (payment) {
      form.reset({
          ...payment,
          date: new Date(payment.date),
          sourceBank: payment.sourceBank ?? "",
          destinationBank: payment.destinationBank ?? "",
          documentUrl: payment.documentUrl,
      });
      setExistingDocumentUrl(payment.documentUrl || null);
    } else {
      form.reset({
        date: new Date(), amount: 0, supplierName: "", method: 'نقدي', classification: 'دفعة من رصيد المبيعات',
        reason: "", responsiblePerson: "", sourceBank: "", destinationBank: "",
      });
      setExistingDocumentUrl(null);
    }
    setIsDialogOpen(true);
  };
  
  const onDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingPayment(null);
    }
    setIsDialogOpen(open);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("حجم الملف يتجاوز 5 ميجابايت.");
        toast({ title: "خطأ", description: "حجم الملف يتجاوز 5 ميجابايت.", variant: "destructive"});
        setSelectedFile(null);
        return;
      }
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setUploadError("نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF.");
        toast({ title: "خطأ", description: "نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF.", variant: "destructive"});
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setExistingDocumentUrl(null); // Clear existing doc if new one is selected
      form.setValue('documentUrl', undefined); // Clear the form value as well
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingFile = () => {
      setExistingDocumentUrl(null);
      form.setValue('documentUrl', undefined);
  }

  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
        if (editingPayment) {
            await updateSupplierPayment(editingPayment, values, selectedFile);
            toast({ title: "نجاح", description: "تم تعديل الدفعة بنجاح." });
        } else {
            await addSupplierPayment(values, selectedFile);
            toast({ title: "نجاح", description: "تم تسجيل الدفعة بنجاح." });
        }

        form.reset();
        setSelectedFile(null);
        setIsDialogOpen(false);
        setEditingPayment(null);
    } catch(error: any) {
        console.error("Failed to submit payment:", error);
        setUploadError(`فشل حفظ الدفعة: ${error.message}`);
        toast({ title: "خطأ", description: `فشل حفظ الدفعة. ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (payment: SupplierPayment) => {
    await deleteSupplierPayment(payment);
  };

  const { totalAmount, paymentsCount } = useMemo(() => {
    return {
      totalAmount: supplierPayments.reduce((acc, p) => acc + p.amount, 0),
      paymentsCount: supplierPayments.length,
    }
  }, [supplierPayments]);

  const sortedPayments = useMemo(() => {
    return [...supplierPayments].sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [supplierPayments]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Landmark className="w-8 h-8" />
              سجل الدفعات
            </h1>
        </div>
        <Button onClick={() => handleOpenDialog(null)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة دفعة جديدة
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ المسجلة</CardTitle>
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
            <CardTitle className="text-sm font-medium">عدد الدفعات</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentsCount}</div>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>{editingPayment ? 'تعديل دفعة لمورد' : 'تسجيل دفعة لمورد'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>تاريخ الصرف</FormLabel><Popover modal={false} open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-right font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="ml-2 h-4 w-4"/>{field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="center"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePopoverOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel>اسم المورد</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger></FormControl><SelectContent>{supplierNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>المبلغ المصروف</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="responsiblePerson" render={({ field }) => (<FormItem><FormLabel>القائم بالتحويل</FormLabel><FormControl><Input placeholder="اسم المسؤول" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  
                  <FormField control={form.control} name="classification" render={({ field }) => (<FormItem><FormLabel>تصنيف الدفعة</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر تصنيف الدفعة..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="دفعة من رصيد المبيعات">دفعة من رصيد المبيعات</SelectItem><SelectItem value="سحب أرباح للمورد">سحب أرباح للمورد</SelectItem><SelectItem value="سداد للمصنع عن المورد">سداد للمصنع عن المورد</SelectItem><SelectItem value="استعادة مبلغ كتسوية">استعادة مبلغ كتسوية (رصيد دائن)</SelectItem><SelectItem value="سحب مبلغ كتسوية">سحب مبلغ كتسوية (رصيد مدين)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />

                  <FormField control={form.control} name="method" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>طريقة التحويل</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="نقدي" /></FormControl><FormLabel className="font-normal">نقدي</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="بنكي" /></FormControl><FormLabel className="font-normal">بنكي</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />

                  {paymentMethodWatcher === 'بنكي' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md"><FormField control={form.control} name="sourceBank" render={({ field }) => (<FormItem><FormLabel>البنك المحول منه</FormLabel><FormControl><Input placeholder="حساب الشركة" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="destinationBank" render={({ field }) => (<FormItem><FormLabel>البنك المحول إليه</FormLabel><FormControl><Input placeholder="بنك المورد" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></div>)}
                  
                  <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>السبب / البيان</FormLabel><FormControl><Textarea placeholder="اكتب سببًا واضحًا للصرف..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <FormItem>
                    <FormLabel>مستند التحويل (اختياري)</FormLabel>
                    <div className='flex flex-col gap-2'>
                        {isSubmitting && selectedFile && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>جاري رفع: {selectedFile.name}</span>
                            </div>
                        )}
                        {uploadError && (
                             <div className="flex items-center gap-2 text-sm text-destructive p-2 border border-destructive/50 rounded-md">
                                <AlertCircle className="h-4 w-4" />
                                <span>{uploadError}</span>
                            </div>
                        )}
                        {selectedFile && !isSubmitting && (
                           <div className="flex items-center justify-between gap-2 text-sm text-primary p-2 border border-dashed rounded-md">
                              <div className="flex items-center gap-2">
                                 <FileIcon className="h-5 w-5" />
                                 <span className="font-medium truncate">{selectedFile.name}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveFile}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">إزالة الملف</span>
                              </Button>
                          </div>
                        )}
                        {existingDocumentUrl && (
                          <div className="flex items-center justify-between gap-2 text-sm text-primary p-2 border border-dashed rounded-md">
                              <a href={existingDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                                 <Paperclip className="h-5 w-5" />
                                 <span className="font-medium truncate">عرض المستند الحالي</span>
                              </a>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveExistingFile}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">إزالة المستند</span>
                              </Button>
                          </div>
                        )}
                        {!selectedFile && !existingDocumentUrl && (
                          <FormControl>
                              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                                  <Paperclip className="ml-2 h-4 w-4" />
                                  اختر ملفًا (صورة أو PDF، بحد أقصى 5 ميجا)
                                  <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                              </Button>
                          </FormControl>
                        )}
                    </div>
                    <FormMessage />
                  </FormItem>


                  <DialogFooter className="pt-4">
                     <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                     </DialogClose>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'جاري الحفظ...' : (editingPayment ? 'حفظ التعديلات' : 'تسجيل الدفعة')}
                     </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل الدفعات</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto">
            <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المورد</TableHead><TableHead>المبلغ</TableHead><TableHead>الطريقة</TableHead><TableHead>التصنيف</TableHead><TableHead>السبب</TableHead><TableHead>المسؤول</TableHead><TableHead>التحويلات</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {sortedPayments.length > 0 ? (
                  sortedPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{format(p.date, 'dd MMMM yyyy', { locale: ar })}</TableCell>
                      <TableCell className="font-medium">{p.supplierName}</TableCell>
                      <TableCell className={`font-bold ${p.classification === 'استعادة مبلغ كتسوية' ? 'text-success' : 'text-destructive'}`}>
                        {p.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{p.classification}</TableCell>
                      <TableCell>{p.reason}</TableCell>
                      <TableCell>{p.responsiblePerson}</TableCell>
                      <TableCell>
                        {p.documentUrl ? (
                          <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            <Paperclip className="h-5 w-5" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /><span className="sr-only">حذف</span></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيحذف الدفعة ومستندها المرفق (إن وجد) بشكل دائم ولا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p)}>متابعة</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center">لا توجد دفعات مسجلة.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
