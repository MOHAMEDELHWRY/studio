"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { type Transaction } from '@/types';

const initialTransactions: Transaction[] = [
    { id: '1', date: new Date('2023-10-01'), supplierName: 'مورد ألف', description: 'مواد بناء', quantity: 10, purchasePrice: 150, totalPurchasePrice: 1500, sellingPrice: 200, totalSellingPrice: 2000, taxes: 50, profit: 450, amountPaidToFactory: 1000, amountReceivedFromSupplier: 0 },
    { id: '2', date: new Date('2023-10-05'), supplierName: 'مورد باء', description: 'أدوات كهربائية', quantity: 5, purchasePrice: 80, totalPurchasePrice: 400, sellingPrice: 120, totalSellingPrice: 600, taxes: 20, profit: 180, amountPaidToFactory: 400, amountReceivedFromSupplier: 0 },
    { id: '3', date: new Date('2023-11-12'), supplierName: 'مورد ألف', description: 'إسمنت', quantity: 20, purchasePrice: 50, totalPurchasePrice: 1000, sellingPrice: 65, totalSellingPrice: 1300, taxes: 30, profit: 270, amountPaidToFactory: 500, amountReceivedFromSupplier: 0 },
];

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  deleteSupplier: (supplierName: string) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

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
