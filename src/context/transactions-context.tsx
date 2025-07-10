
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { type Transaction, type Expense, type BalanceTransfer, type SupplierPayment } from '@/types';
import { db, storage } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-context';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteSupplier: (supplierName: string) => Promise<void>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (updatedExpense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  balanceTransfers: BalanceTransfer[];
  addBalanceTransfer: (transfer: Omit<BalanceTransfer, 'id'>) => Promise<void>;
  updateBalanceTransfer: (updatedTransfer: BalanceTransfer) => Promise<void>;
  deleteBalanceTransfer: (transferId: string) => Promise<void>;
  supplierPayments: SupplierPayment[];
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'documentUrl'>, documentFile?: File) => Promise<void>;
  updateSupplierPayment: (updatedPayment: SupplierPayment, documentFile?: File) => Promise<void>;
  deleteSupplierPayment: (paymentId: string) => Promise<void>;
  supplierNames: string[];
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balanceTransfers, setBalanceTransfers] = useState<BalanceTransfer[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const supplierNames = useMemo(() => {
    const allNames = new Set<string>();
    transactions.forEach(t => allNames.add(t.supplierName));
    expenses.forEach(e => { if (e.supplierName) allNames.add(e.supplierName) });
    balanceTransfers.forEach(t => {
      allNames.add(t.fromSupplier);
      allNames.add(t.toSupplier);
    });
    supplierPayments.forEach(p => allNames.add(p.supplierName));
    return Array.from(allNames).sort((a,b) => a.localeCompare(b));
  }, [transactions, expenses, balanceTransfers, supplierPayments]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setTransactions([]);
        setExpenses([]);
        setBalanceTransfers([]);
        setSupplierPayments([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const transactionsCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
        const expensesCollectionRef = collection(db, 'users', currentUser.uid, 'expenses');
        const balanceTransfersCollectionRef = collection(db, 'users', currentUser.uid, 'balanceTransfers');
        const supplierPaymentsCollectionRef = collection(db, 'users', currentUser.uid, 'supplierPayments');
        
        const transactionSnapshot = await getDocs(transactionsCollectionRef);
        const fetchedTransactions = transactionSnapshot.docs.map(doc => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
          const executionDate = data.executionDate ? (data.executionDate instanceof Timestamp ? data.executionDate.toDate() : new Date(data.executionDate)) : undefined;
          const dueDate = data.dueDate ? (data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate)) : undefined;
          
          return {
            ...data,
            id: doc.id,
            date,
            executionDate,
            dueDate,
          } as Transaction;
        });
        setTransactions(fetchedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));

        const expenseSnapshot = await getDocs(expensesCollectionRef);
        const fetchedExpenses = expenseSnapshot.docs.map(doc => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
          return {
            ...data,
            id: doc.id,
            date,
          } as Expense;
        });
        setExpenses(fetchedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime()));

        const transferSnapshot = await getDocs(balanceTransfersCollectionRef);
        const fetchedTransfers = transferSnapshot.docs.map(doc => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
          return {
            ...data,
            id: doc.id,
            date,
            fromAccount: data.fromAccount || 'sales_balance',
            toAccount: data.toAccount || 'sales_balance',
          } as BalanceTransfer;
        });
        setBalanceTransfers(fetchedTransfers.sort((a, b) => b.date.getTime() - a.date.getTime()));

        const paymentSnapshot = await getDocs(supplierPaymentsCollectionRef);
        const fetchedPayments = paymentSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          let classification = data.classification;

          if (!classification && data.deductFrom) {
            if (data.deductFrom === 'رصيد المصنع') {
              classification = 'سداد للمصنع عن المورد';
            } else { 
              classification = 'دفعة من رصيد المبيعات';
            }
          }
          
          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

          return {
            ...data,
            id: doc.id,
            date,
            classification: classification || 'دفعة من رصيد المبيعات', 
          } as SupplierPayment;
        });
        setSupplierPayments(fetchedPayments.sort((a, b) => b.date.getTime() - a.date.getTime()));


      } catch (error) {
        console.error("Could not fetch data from Firestore", error);
        toast({ title: "خطأ", description: "لم نتمكن من تحميل البيانات من قاعدة البيانات.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
      const transactionsCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
      const docData = {
        ...transaction,
        date: Timestamp.fromDate(transaction.date),
        executionDate: transaction.executionDate ? Timestamp.fromDate(transaction.executionDate) : null,
        dueDate: transaction.dueDate ? Timestamp.fromDate(transaction.dueDate) : null,
      };
      const docRef = await addDoc(transactionsCollectionRef, docData as any);
      setTransactions(prev => [{ ...transaction, id: docRef.id }, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error) {
      console.error("Error adding transaction: ", error);
      throw error;
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!currentUser) throw new Error("User not authenticated");
     try {
      const { id, ...dataToUpdate } = updatedTransaction;
      const transactionDoc = doc(db, 'users', currentUser.uid, 'transactions', id);
      const docData = {
        ...dataToUpdate,
        date: Timestamp.fromDate(updatedTransaction.date),
        executionDate: updatedTransaction.executionDate ? Timestamp.fromDate(updatedTransaction.executionDate) : null,
        dueDate: updatedTransaction.dueDate ? Timestamp.fromDate(updatedTransaction.dueDate) : null,
      };
      await updateDoc(transactionDoc, docData as any);
      setTransactions(prev => 
        prev.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t))
           .sort((a, b) => b.date.getTime() - a.date.getTime())
      );
    } catch (error) {
      console.error("Error updating transaction: ", error);
      throw error;
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!currentUser) return;
    try {
      const transactionDoc = doc(db, 'users', currentUser.uid, 'transactions', transactionId);
      await deleteDoc(transactionDoc);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      toast({
        title: "تم الحذف",
        description: "تم حذف العملية بنجاح.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حذف العملية.", variant: "destructive" });
    }
  };

  const deleteSupplier = async (supplierName: string) => {
    if (!currentUser) return;
     try {
      const transactionsCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
      const batch = writeBatch(db);
      const q = query(transactionsCollectionRef, where("supplierName", "==", supplierName));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
      });
      
      await batch.commit();

      setTransactions(prev => prev.filter(t => t.supplierName !== supplierName));
      toast({
        title: 'تم الحذف',
        description: `تم حذف المورد "${supplierName}" وجميع عملياته بنجاح.`,
        variant: 'default',
      });
    } catch (error) {
       console.error("Error deleting supplier transactions: ", error);
       toast({ title: "خطأ", description: "لم نتمكن من حذف عمليات المورد.", variant: "destructive" });
    }
  };
  
  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
      const expensesCollectionRef = collection(db, 'users', currentUser.uid, 'expenses');
      const docData = {
        ...expense,
        date: Timestamp.fromDate(expense.date),
      };
      const docRef = await addDoc(expensesCollectionRef, docData as any);
      setExpenses(prev => [{...expense, id: docRef.id }, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error) {
      console.error("Error adding expense: ", error);
      throw error;
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    if (!currentUser) throw new Error("User not authenticated");
     try {
      const { id, ...dataToUpdate } = updatedExpense;
      const expenseDoc = doc(db, 'users', currentUser.uid, 'expenses', id);
      const docData = {
        ...dataToUpdate,
        date: Timestamp.fromDate(updatedExpense.date),
      };
      await updateDoc(expenseDoc, docData);
      setExpenses(prev => 
        prev.map(e => (e.id === updatedExpense.id ? updatedExpense : e))
           .sort((a, b) => b.date.getTime() - a.date.getTime())
      );
    } catch (error) {
      console.error("Error updating expense: ", error);
      throw error;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!currentUser) return;
    try {
      const expenseDoc = doc(db, 'users', currentUser.uid, 'expenses', expenseId);
      await deleteDoc(expenseDoc);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      toast({
        title: "تم الحذف",
        description: "تم حذف المصروف بنجاح.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting expense: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حذف المصروف.", variant: "destructive" });
    }
  };

  const addBalanceTransfer = async (transfer: Omit<BalanceTransfer, 'id'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
      const transfersCollectionRef = collection(db, 'users', currentUser.uid, 'balanceTransfers');
      const docData = {
        ...transfer,
        date: Timestamp.fromDate(transfer.date),
      };
      const docRef = await addDoc(transfersCollectionRef, docData as any);
      setBalanceTransfers(prev => [{ ...transfer, id: docRef.id }, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
      
      // If transfer is an expense, add it to expenses too
      if (transfer.fromAccount === 'profit_expense') {
        const expenseData: Omit<Expense, 'id'> = {
          date: transfer.date,
          description: `تحويل رصيد إلى ${transfer.toSupplier}: ${transfer.reason}`,
          amount: transfer.amount,
          supplierName: transfer.fromSupplier
        };
        await addExpense(expenseData);
      }

    } catch (error) {
      console.error("Error adding balance transfer: ", error);
      throw error;
    }
  };

  const updateBalanceTransfer = async (updatedTransfer: BalanceTransfer) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
      const { id, ...dataToUpdate } = updatedTransfer;
      const transferDoc = doc(db, 'users', currentUser.uid, 'balanceTransfers', id);
      const docData = {
        ...dataToUpdate,
        date: Timestamp.fromDate(updatedTransfer.date),
      };
      await updateDoc(transferDoc, docData);
      setBalanceTransfers(prev =>
        prev.map(t => (t.id === updatedTransfer.id ? updatedTransfer : t))
          .sort((a, b) => b.date.getTime() - a.date.getTime())
      );
    } catch (error) {
      console.error("Error updating balance transfer: ", error);
      throw error;
    }
  };

  const deleteBalanceTransfer = async (transferId: string) => {
    if (!currentUser) return;
    try {
      const transferDocRef = doc(db, 'users', currentUser.uid, 'balanceTransfers', transferId);
      const transferDoc = await getDoc(transferDocRef);
      const transferData = transferDoc.data() as BalanceTransfer;
      
      await deleteDoc(transferDocRef);
      
      setBalanceTransfers(prev => prev.filter(t => t.id !== transferId));

      if (transferData.fromAccount === 'profit_expense') {
        // This is tricky. We need to find and delete the corresponding expense.
        // For simplicity now, we assume a manual deletion is needed or we don't handle it.
        // A more robust solution would be to store the expenseId in the transfer doc.
        toast({ title: "تنبيه", description: "تم حذف التحويل، لكن قد تحتاج لحذف المصروف المرتبط به يدويًا."})
      }

      toast({
        title: "تم الحذف",
        description: "تم حذف عملية التحويل بنجاح.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting balance transfer: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حذف عملية التحويل.", variant: "destructive" });
    }
  };

  const addSupplierPayment = async (payment: Omit<SupplierPayment, 'id' | 'documentUrl' | 'documentUploadStatus'>, documentFile?: File) => {
    if (!currentUser) throw new Error("User not authenticated for payment");

    // Generate a new document reference with a unique ID
    const paymentDocRef = doc(collection(db, 'users', currentUser.uid, 'supplierPayments'));
    const paymentId = paymentDocRef.id;
    
    // Optimistically update UI
    const newPayment: SupplierPayment = {
      ...payment,
      id: paymentId,
      documentUploadStatus: documentFile ? 'uploading' : 'none',
    };
    setSupplierPayments(prev => [newPayment, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));

    try {
      let documentUrl = '';
      if (documentFile) {
        const fileRef = storageRef(storage, `users/${currentUser.uid}/transfers/${paymentId}/${documentFile.name}`);
        await uploadBytes(fileRef, documentFile);
        documentUrl = await getDownloadURL(fileRef);
      }

      const paymentData = {
          ...payment,
          date: Timestamp.fromDate(payment.date),
          documentUrl: documentUrl,
          documentUploadStatus: documentFile ? 'completed' : 'none'
      };

      await setDoc(paymentDocRef, paymentData);
      
      // Update UI with final state
      setSupplierPayments(prev => prev.map(p =>
          p.id === paymentId ? { ...p, documentUrl, documentUploadStatus: 'completed' } : p
      ));
    } catch (error) {
      console.error("Error saving payment:", error);
      // Revert optimistic UI update on failure
      setSupplierPayments(prev => prev.filter(p => p.id !== paymentId));
      toast({ title: "خطأ", description: "فشل حفظ الدفعة. يرجى المحاولة مرة أخرى.", variant: "destructive" });
      throw error;
    }
  };
  
  const updateSupplierPayment = async (updatedPayment: SupplierPayment, documentFile?: File) => {
    if (!currentUser) throw new Error("User not authenticated");
    const { id, ...dataToUpdate } = updatedPayment;
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', id);

    try {
        const originalPaymentDoc = await getDoc(paymentDocRef);
        const originalPayment = originalPaymentDoc.data() as SupplierPayment | undefined;
        if (!originalPayment) throw new Error("Payment not found");

        setSupplierPayments(prev => prev.map(p => 
            p.id === id ? { ...updatedPayment, documentUploadStatus: documentFile ? 'uploading' : p.documentUploadStatus } : p
        ));
        
        let newDocumentUrl = dataToUpdate.documentUrl;

        if (documentFile) {
            const fileRef = storageRef(storage, `users/${currentUser.uid}/transfers/${id}/${documentFile.name}`);
            await uploadBytes(fileRef, documentFile);
            newDocumentUrl = await getDownloadURL(fileRef);
            
            if (originalPayment.documentUrl && originalPayment.documentUrl !== newDocumentUrl) {
                try {
                    const oldFileRef = storageRef(storage, originalPayment.documentUrl);
                    await deleteObject(oldFileRef);
                } catch (storageError: any) {
                    if (storageError.code !== 'storage/object-not-found') {
                        console.warn("Could not delete old file, but proceeding.", storageError);
                    }
                }
            }
        }
        
        const finalData = { 
            ...dataToUpdate, 
            date: Timestamp.fromDate(dataToUpdate.date),
            documentUrl: newDocumentUrl,
            documentUploadStatus: documentFile ? 'completed' : dataToUpdate.documentUploadStatus
        };
        await updateDoc(paymentDocRef, finalData as any);

        setSupplierPayments(prev => prev.map(p => 
            p.id === id ? { ...updatedPayment, documentUrl: newDocumentUrl, documentUploadStatus: 'completed' } : p
        ).sort((a,b) => b.date.getTime() - a.date.getTime()));

    } catch (error) {
        console.error("Error updating supplier payment:", error);
        setSupplierPayments(prev => prev.map(p => p.id === id ? { ...p, documentUploadStatus: 'failed' } : p));
        toast({ title: "خطأ", description: "فشل تحديث الدفعة.", variant: "destructive" });
        throw error;
    }
  };
  
  const deleteSupplierPayment = async (paymentId: string) => {
    if (!currentUser) return;
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', paymentId);
    
    const paymentToDelete = supplierPayments.find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    setSupplierPayments(prev => prev.filter(p => p.id !== paymentId));

    try {
      if (paymentToDelete.documentUrl) {
        try {
          const fileRef = storageRef(storage, paymentToDelete.documentUrl);
          await deleteObject(fileRef);
        } catch(storageError: any) {
           if (storageError.code !== 'storage/object-not-found') {
              console.error("Could not delete file from storage, proceeding with DB delete.", storageError);
              toast({ title: "تحذير", description: "لم يتمكن من حذف الملف المرفق، لكن تم حذف السجل." });
           }
        }
      }
      await deleteDoc(paymentDocRef);
      toast({ title: "تم الحذف", description: "تم حذف الدفعة بنجاح." });
    } catch (error) {
      setSupplierPayments(prev => [...prev, paymentToDelete].sort((a,b)=>b.date.getTime() - a.date.getTime()));
      console.error("Error deleting supplier payment: ", error);
      toast({ title: "خطأ", description: "لم نتمكن من حذف الدفعة.", variant: "destructive" });
    }
  };


  return (
    <TransactionsContext.Provider value={{ 
      transactions, addTransaction, updateTransaction, deleteTransaction, deleteSupplier, 
      expenses, addExpense, updateExpense, deleteExpense,
      balanceTransfers, addBalanceTransfer, updateBalanceTransfer, deleteBalanceTransfer,
      supplierPayments, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment,
      supplierNames,
      loading 
    }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}
