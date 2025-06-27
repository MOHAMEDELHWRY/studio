"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { type Transaction, type Expense } from '@/types';

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

// Function to load expenses from localStorage
const loadExpenses = (): Expense[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const serializedState = localStorage.getItem('expenses');
    if (serializedState === null) {
      return [];
    }
    const storedExpenses = JSON.parse(serializedState);
    return storedExpenses.map((e: any) => ({
      ...e,
      date: new Date(e.date),
    }));
  } catch (error) {
    console.error("Could not load expenses from localStorage", error);
    return [];
  }
};

// Function to save expenses to localStorage
const saveExpenses = (expenses: Expense[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const serializedState = JSON.stringify(expenses);
    localStorage.setItem('expenses', serializedState);
  } catch (error) {
    console.error("Could not save expenses to localStorage", error);
  }
};


interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (updatedTransaction: Transaction) => void;
  deleteSupplier: (supplierName: string) => void;
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  updateExpense: (updatedExpense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setTransactions(loadTransactions());
    setExpenses(loadExpenses());
  }, []);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);
  
  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);


  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t))
         .sort((a, b) => b.date.getTime() - a.date.getTime())
    );
  };

  const deleteSupplier = (supplierName: string) => {
    setTransactions(prev => prev.filter(t => t.supplierName !== supplierName));
  };
  
  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => 
      prev.map(t => (t.id === updatedExpense.id ? updatedExpense : t))
         .sort((a, b) => b.date.getTime() - a.date.getTime())
    );
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteSupplier, expenses, addExpense, updateExpense, deleteExpense }}>
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
