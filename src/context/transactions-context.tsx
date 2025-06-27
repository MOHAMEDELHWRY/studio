"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { type Transaction } from '@/types';

// Function to load transactions from localStorage
const loadTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const serializedState = localStorage.getItem('transactions');
    if (serializedState === null) {
      return [];
    }
    // Need to parse dates correctly
    const storedTransactions = JSON.parse(serializedState);
    return storedTransactions.map((t: any) => ({
      ...t,
      governorate: t.governorate || '',
      city: t.city || '',
      date: new Date(t.date),
      executionDate: new Date(t.executionDate),
      dueDate: new Date(t.dueDate),
    }));
  } catch (error) {
    console.error("Could not load transactions from localStorage", error);
    return [];
  }
};

// Function to save transactions to localStorage
const saveTransactions = (transactions: Transaction[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const serializedState = JSON.stringify(transactions);
    localStorage.setItem('transactions', serializedState);
  } catch (error) {
    console.error("Could not save transactions to localStorage", error);
  }
};


interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  deleteSupplier: (supplierName: string) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);


  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const deleteSupplier = (supplierName: string) => {
    setTransactions(prev => prev.filter(t => t.supplierName !== supplierName));
  };

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, deleteSupplier }}>
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
