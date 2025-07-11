
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
  addSupplierPayment: (paymentData: Omit<SupplierPayment, 'id' | 'documentUrl' | 'documentPath'>, file?: File | null) => Promise<void>;
  updateSupplierPayment: (existingPayment: SupplierPayment, paymentData: Omit<SupplierPayment, 'id' | 'documentUrl' | 'documentPath'>, file?: File | null) => Promise<void>;
  deleteSupplierPayment: (payment: SupplierPayment) => Promise<void>;
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
          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

          return {
            ...data,
            id: doc.id,
            date,
            classification: data.classification || 'دفعة من رصيد المبيعات', 
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

  const uploadDocument = async (file: File, paymentId: string): Promise<{ url: string; path: string }> => {
    if (!currentUser) throw new Error("User not authenticated for upload");
    const filePath = `users/${currentUser.uid}/transfers/${paymentId}/${file.name}`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, path: filePath };
  };
  
  const addSupplierPayment = async (paymentData: Omit<SupplierPayment, 'id' | 'documentUrl' | 'documentPath'>, file: File | null = null) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const paymentDocRef = doc(collection(db, 'users', currentUser.uid, 'supplierPayments'));
    const paymentId = paymentDocRef.id;
    let documentInfo: { documentUrl?: string; documentPath?: string } = {};

    try {
      if (file) {
        const { url, path } = await uploadDocument(file, paymentId);
        documentInfo = { documentUrl: url, documentPath: path };
      }
      
      const finalPaymentData = {
        ...paymentData,
        ...documentInfo,
        date: Timestamp.fromDate(paymentData.date),
      };
      
      await setDoc(paymentDocRef, finalPaymentData);

      const newPayment = { ...paymentData, ...documentInfo, id: paymentId } as SupplierPayment;
      setSupplierPayments(prev => [...prev, newPayment].sort((a, b) => b.date.getTime() - a.date.getTime()));

    } catch (error) {
        console.error("Error in addSupplierPayment: ", error);
        throw error;
    }
  };
  
  const updateSupplierPayment = async (existingPayment: SupplierPayment, paymentData: Omit<SupplierPayment, 'id' | 'documentUrl' | 'documentPath'>, file: File | null = null) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', existingPayment.id);
    const updatedData: Partial<SupplierPayment> = { ...paymentData };

    try {
      // Handle file upload/replacement
      if (file) {
        // If a new file is uploaded, delete the old one first if it exists
        if (existingPayment.documentPath) {
          const oldFileRef = storageRef(storage, existingPayment.documentPath);
          await deleteObject(oldFileRef).catch(error => console.warn("Old file not found, proceeding.", error));
        }
        const { url, path } = await uploadDocument(file, existingPayment.id);
        updatedData.documentUrl = url;
        updatedData.documentPath = path;
      } else if (!paymentData.documentUrl && existingPayment.documentUrl) {
          // This indicates the user removed the existing document without uploading a new one
          if (existingPayment.documentPath) {
               const oldFileRef = storageRef(storage, existingPayment.documentPath);
               await deleteObject(oldFileRef).catch(error => console.warn("Old file not found, proceeding.", error));
          }
          updatedData.documentUrl = undefined;
          updatedData.documentPath = undefined;
      }

      const finalDataToUpdate = {
        ...updatedData,
        date: Timestamp.fromDate(paymentData.date),
      };

      await updateDoc(paymentDocRef, finalDataToUpdate);
      
      const updatedLocalPayment = { ...existingPayment, ...finalDataToUpdate, date: paymentData.date };

      setSupplierPayments(prev => prev.map(p => 
          p.id === existingPayment.id ? updatedLocalPayment : p
      ).sort((a,b) => b.date.getTime() - a.date.getTime()));
    } catch(error) {
       console.error("Error in updateSupplierPayment: ", error);
       throw error;
    }
  };
  
  const deleteSupplierPayment = async (payment: SupplierPayment) => {
    if (!currentUser) return;
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', payment.id);
    
    try {
        await deleteDoc(paymentDocRef);
        if (payment.documentPath) {
            const fileRef = storageRef(storage, payment.documentPath);
            await deleteObject(fileRef).catch(error => console.warn("File to delete not found, proceeding.", error));
        }
        setSupplierPayments(prev => prev.filter(p => p.id !== payment.id));
        toast({ title: "تم الحذف", description: "تم حذف الدفعة ومستندها المرفق بنجاح." });
    } catch (error) {
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
