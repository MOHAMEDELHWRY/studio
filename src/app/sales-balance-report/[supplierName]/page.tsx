"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function SimplifiedSalesReport() {
  const params = useParams();
  const { transactions, balanceTransfers } = useTransactions();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const { transactionsWithBalances, supplierStats } = useMemo(() => {
    if (!supplierName) {
        return { 
            transactionsWithBalances: [],
            supplierStats: { totalSales: 0, totalReceivedFromSupplier: 0 }
        };
    }

    const supplierTransactionsAsc = transactions
      .filter(t => t.supplierName === supplierName)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const transferAdjustment = balanceTransfers.reduce((acc, t) => {
        if (t.toSupplier === supplierName) return acc + t.amount;
        if (t.fromSupplier === supplierName) return acc - t.amount;
        return acc;
    }, 0);
      
    const stats = supplierTransactionsAsc.reduce((acc, t) => {
      acc.totalSales += t.totalSellingPrice;
      acc.totalReceivedFromSupplier += t.amountReceivedFromSupplier;
      return acc;
    }, { 
      totalSales: 0, 
      totalReceivedFromSupplier: 0,
    });
    
    stats.totalReceivedFromSupplier += transferAdjustment;
    
    let salesBalance = transferAdjustment; // Start balance with transfers not linked to a transaction date
    const balances = supplierTransactionsAsc.map(t => {
      salesBalance += t.amountReceivedFromSupplier - t.totalSellingPrice;
      return { ...t, salesRunningBalance: salesBalance };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

    return { transactionsWithBalances: balances, supplierStats: stats };
  }, [transactions, supplierName, balanceTransfers]);

  const finalSalesBalance = supplierStats.totalReceivedFromSupplier - supplierStats.totalSales;

  if (!supplierName) {
    return (
      <div className="p-8 text-center">
        <p>اسم المورد غير محدد.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white text-black p-4 sm:p-8">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            background-color: white !important;
          }
          .printable-content {
            font-size: 10pt;
            color: black;
          }
        }
      `}</style>
      
      <header className="flex justify-between items-start mb-8 border-b pb-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">التقرير المبسط لرصيد المبيعات: {supplierName}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">تم إنشاؤه في: {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: ar })}</p>
        </div>
        <Button onClick={() => window.print()} className="no-print" variant="outline">
            <Printer className="ml-2 h-4 w-4" />
            طباعة / PDF
        </Button>
      </header>
      
      <div className="printable-content">
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">ملخص رصيد المبيعات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المستلم (بعد التحويلات)</h3>
                  <p className="text-base sm:text-xl font-bold text-green-600">{supplierStats.totalReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المبيعات</h3>
                  <p className="text-base sm:text-xl font-bold text-gray-800">{supplierStats.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">رصيد المبيعات النهائي</h3>
                  <p className={'text-base sm:text-xl font-bold ' + (finalSalesBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{finalSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4 border-b pb-2">سجل عمليات المبيعات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right border-collapse border">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 border font-semibold text-gray-700">التاريخ</th>
                    <th className="p-2 border font-semibold text-gray-700">المبلغ المستلم من المورد</th>
                    <th className="p-2 border font-semibold text-gray-700">سعر البيع (للوحدة)</th>
                    <th className="p-2 border font-semibold text-gray-700">إجمالي البيع</th>
                    <th className="p-2 border font-semibold text-gray-700">رصيد المبيعات التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalances.length > 0 ? (
                    transactionsWithBalances.map(t => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 border whitespace-nowrap">{format(t.date, 'dd-MM-yyyy', { locale: ar })}</td>
                        <td className="p-2 border whitespace-nowrap text-green-600">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className="p-2 border whitespace-nowrap">
                          {t.sellingPrice > 0 ? (
                            t.sellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-2 border whitespace-nowrap">
                          {t.totalSellingPrice > 0 ? (
                            t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                          ) : (
                            <span className="text-gray-500">لم يتم البيع</span>
                          )}
                        </td>
                        <td className={'p-2 border whitespace-nowrap font-bold ' + (t.salesRunningBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{t.salesRunningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-500 border">
                        لا توجد عمليات لهذا المورد.
                      </td>
                    </tr>
                  )}
                </tbody>
            </table>
          </div>
        </section>
      </div>
      
      <footer className="text-center text-xs text-gray-400 mt-8 no-print">
        <p>دفتر حساباتي - تقرير تم إنشاؤه تلقائيًا</p>
      </footer>
    </div>
  );
}
