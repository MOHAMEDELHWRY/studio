
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
        
        // Fetch transactions
        const transactionSnapshot = await getDocs(transactionsCollectionRef);
        const fetchedTransactions = transactionSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: new Date(data.date),
            executionDate: data.executionDate ? new Date(data.executionDate) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          } as Transaction;
        });
        setTransactions(fetchedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));

        // Fetch expenses
        const expenseSnapshot = await getDocs(expensesCollectionRef);
        const fetchedExpenses = expenseSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: new Date(data.date),
          } as Expense;
        });
        setExpenses(fetchedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime()));

        // Fetch balance transfers
        const transferSnapshot = await getDocs(balanceTransfersCollectionRef);
        const fetchedTransfers = transferSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: new Date(data.date),
            classification: data.classification || 'تحويل عام',
          } as BalanceTransfer;
        });
        setBalanceTransfers(fetchedTransfers.sort((a, b) => b.date.getTime() - a.date.getTime()));

        // Fetch supplier payments
        const paymentSnapshot = await getDocs(supplierPaymentsCollectionRef);
        const fetchedPayments = paymentSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          let classification = data.classification;

          // Backward compatibility for old `deductFrom` field
          if (!classification && data.deductFrom) {
            if (data.deductFrom === 'رصيد المصنع') {
              classification = 'سداد للمصنع عن المورد';
            } else { // 'رصيد المبيعات' and any other case
              classification = 'دفعة من رصيد المبيعات';
            }
          }

          return {
            ...data,
            id: doc.id,
            date: new Date(data.date),
            classification: classification || 'دفعة من رصيد المبيعات', // Default for very old data
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
        date: transaction.date.toISOString(),
        executionDate: transaction.executionDate?.toISOString() || null,
        dueDate: transaction.dueDate?.toISOString() || null,
      };
      const docRef = await addDoc(transactionsCollectionRef, docData);
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
        date: updatedTransaction.date.toISOString(),
        executionDate: updatedTransaction.executionDate?.toISOString() || null,
        dueDate: updatedTransaction.dueDate?.toISOString() || null,
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
        date: expense.date.toISOString(),
      };
      const docRef = await addDoc(expensesCollectionRef, docData);
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
        date: updatedExpense.date.toISOString(),
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
        date: transfer.date.toISOString(),
      };
      const docRef = await addDoc(transfersCollectionRef, docData);
      setBalanceTransfers(prev => [{ ...transfer, id: docRef.id }, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
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
        date: updatedTransfer.date.toISOString(),
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
      const transferDoc = doc(db, 'users', currentUser.uid, 'balanceTransfers', transferId);
      await deleteDoc(transferDoc);
      setBalanceTransfers(prev => prev.filter(t => t.id !== transferId));
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

  const addSupplierPayment = async (payment: Omit<SupplierPayment, 'id' | 'documentUrl'>, documentFile?: File) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const paymentDocRef = doc(collection(db, 'users', currentUser.uid, 'supplierPayments'));

    try {
        let documentUrl = '';
        if (documentFile) {
            const fileRef = storageRef(storage, `users/${currentUser.uid}/supplierPayments/${paymentDocRef.id}/${documentFile.name}`);
            await uploadBytes(fileRef, documentFile);
            documentUrl = await getDownloadURL(fileRef);
        }

        const newPaymentData = { ...payment, date: payment.date.toISOString(), documentUrl };
        await setDoc(paymentDocRef, newPaymentData);

        const finalPayment: SupplierPayment = { ...payment, id: paymentDocRef.id, documentUrl };
        setSupplierPayments(prev => [...prev, finalPayment].sort((a, b) => b.date.getTime() - a.date.getTime()));

    } catch (error) {
        console.error("Error adding supplier payment: ", error);
        throw error;
    }
  };

  const updateSupplierPayment = async (updatedPayment: SupplierPayment, documentFile?: File) => {
    if (!currentUser) throw new Error("User not authenticated");
    const { id, ...dataToUpdate } = updatedPayment;
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', id);

    try {
        let newDocumentUrl = dataToUpdate.documentUrl;
        const oldDocumentUrl = dataToUpdate.documentUrl;

        if (documentFile) {
            const newFileRef = storageRef(storage, `users/${currentUser.uid}/supplierPayments/${id}/${documentFile.name}`);
            await uploadBytes(newFileRef, documentFile);
            newDocumentUrl = await getDownloadURL(newFileRef);
        }

        const docData = {
            ...dataToUpdate,
            date: updatedPayment.date.toISOString(),
            documentUrl: newDocumentUrl,
        };

        await updateDoc(paymentDocRef, docData as any);

        if (documentFile && oldDocumentUrl && oldDocumentUrl !== newDocumentUrl) {
            try {
                const oldFileRef = storageRef(storage, oldDocumentUrl);
                await deleteObject(oldFileRef);
            } catch (storageError: any) {
                if (storageError.code !== 'storage/object-not-found') {
                    console.error("Could not delete old file from storage, but update was successful.", storageError);
                }
            }
        }
        
        const finalUpdatedPayment: SupplierPayment = { ...updatedPayment, documentUrl: newDocumentUrl };
        setSupplierPayments(prev =>
            prev.map(p => (p.id === id ? finalUpdatedPayment : p)).sort((a, b) => b.date.getTime() - a.date.getTime())
        );
    } catch (error) {
        console.error("Error updating supplier payment: ", error);
        throw error;
    }
  };
  
  const deleteSupplierPayment = async (paymentId: string) => {
    if (!currentUser) return;
    const paymentDocRef = doc(db, 'users', currentUser.uid, 'supplierPayments', paymentId);
    try {
      const docSnap = await getDoc(paymentDocRef);
      if (docSnap.exists()) {
        const paymentData = docSnap.data() as SupplierPayment;
        if (paymentData.documentUrl) {
          try {
            const fileRef = storageRef(storage, paymentData.documentUrl);
            await deleteObject(fileRef);
          } catch(storageError: any) {
             if (storageError.code !== 'storage/object-not-found') {
                console.error("Could not delete file from storage, proceeding with DB delete.", storageError);
             }
          }
        }
      }

      await deleteDoc(paymentDocRef);
      setSupplierPayments(prev => prev.filter(p => p.id !== paymentId));
      toast({ title: "تم الحذف", description: "تم حذف الدفعة بنجاح." });
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
