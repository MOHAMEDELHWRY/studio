"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ReportRow {
  id: string;
  date: Date;
  description: string;
  credit: number;
  debit: number;
  balance: number;
}

export default function SimplifiedSalesReport() {
  const params = useParams();
  const { transactions, balanceTransfers, supplierPayments } = useTransactions();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const { reportRows, finalSalesBalance, supplierStats } = useMemo(() => {
    if (!supplierName) {
        return { 
            reportRows: [],
            finalSalesBalance: 0,
            supplierStats: { totalSales: 0, totalReceivedFromSupplier: 0 }
        };
    }

    const supplierTransactions = transactions.filter(t => t.supplierName === supplierName);
    
    const combinedEvents = [
      ...supplierTransactions.map(t => ({
        id: t.id,
        date: t.date,
        type: 'transaction' as const,
        payload: t
      })),
      ...balanceTransfers
        .filter(t => t.fromSupplier === supplierName || t.toSupplier === supplierName)
        .map(t => ({
          id: t.id,
          date: t.date,
          type: 'transfer' as const,
          payload: t
        })),
      ...supplierPayments
        .filter(p => p.supplierName === supplierName && p.deductFrom === 'رصيد المبيعات')
        .map(p => ({
          id: p.id,
          date: p.date,
          type: 'payment' as const,
          payload: p
        }))
    ].sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Define a stable sort order for events on the same millisecond
      const typeOrder = { 'transaction': 1, 'payment': 2, 'transfer': 3 };
      if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
      return a.id.localeCompare(b.id);
    });

    let balance = 0;
    const rows: ReportRow[] = [];

    combinedEvents.forEach(event => {
        if (event.type === 'transaction') {
            const t = event.payload;
            if (t.amountReceivedFromSupplier > 0) {
                balance += t.amountReceivedFromSupplier;
                rows.push({
                    id: `${t.id}-credit`,
                    date: t.date,
                    description: `دفعة لعملية: ${t.description} (${t.quantity} طن)`,
                    credit: t.amountReceivedFromSupplier,
                    debit: 0,
                    balance: balance,
                });
            }
            if (t.totalSellingPrice > 0) {
                balance -= t.totalSellingPrice;
                rows.push({
                    id: `${t.id}-debit`,
                    date: t.date,
                    description: `مبيعات عملية: ${t.description} (${t.quantity} طن)`,
                    credit: 0,
                    debit: t.totalSellingPrice,
                    balance: balance,
                });
            }
        } else if (event.type === 'transfer') {
            const t = event.payload;
            const isCredit = t.toSupplier === supplierName;
            const amount = t.amount;
            balance += isCredit ? amount : -amount;
            rows.push({
                id: t.id,
                date: t.date,
                description: `تحويل رصيد ${isCredit ? 'من' : 'إلى'} ${isCredit ? t.fromSupplier : t.toSupplier} - ${t.reason}`,
                credit: isCredit ? amount : 0,
                debit: !isCredit ? amount : 0,
                balance: balance,
            });
        } else if (event.type === 'payment') {
            const p = event.payload;
            balance -= p.amount; // Payments to supplier are a debit on our side (money out)
            rows.push({
                id: p.id,
                date: p.date,
                description: `دفعة للمورد - ${p.reason}`,
                credit: 0,
                debit: p.amount,
                balance: balance,
            });
        }
    });

    const finalTotalSales = supplierTransactions.reduce((acc, t) => acc + t.totalSellingPrice, 0);
    const totalReceivedFromSupplierAfterAdjustments = balance + finalTotalSales;

    const supplierStats = {
      totalSales: finalTotalSales,
      totalReceivedFromSupplier: totalReceivedFromSupplierAfterAdjustments,
    };

    const sortedRows = rows.sort((a, b) => {
        const dateA = a.date.getTime();
        const dateB = b.date.getTime();
        if (dateA !== dateB) return b.date.getTime() - a.date.getTime();
        return b.id.localeCompare(a.id);
    });

    return { 
        reportRows: sortedRows,
        finalSalesBalance: balance, 
        supplierStats 
    };
  }, [transactions, balanceTransfers, supplierPayments, supplierName]);


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
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المستلم (بعد التحويلات والدفعات)</h3>
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
          <h2 className="text-lg font-bold mb-4 border-b pb-2">كشف حساب المبيعات التفصيلي</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right border-collapse border">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 border font-semibold text-gray-700">التاريخ</th>
                    <th className="p-2 border font-semibold text-gray-700">البيان</th>
                    <th className="p-2 border font-semibold text-gray-700">دائن (+)</th>
                    <th className="p-2 border font-semibold text-gray-700">مدين (-)</th>
                    <th className="p-2 border font-semibold text-gray-700">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length > 0 ? (
                    reportRows.map(row => (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 border whitespace-nowrap">{format(row.date, 'dd-MM-yyyy', { locale: ar })}</td>
                        <td className="p-2 border">{row.description}</td>
                        <td className="p-2 border whitespace-nowrap text-green-600">
                           {row.credit > 0 ? row.credit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}
                        </td>
                        <td className="p-2 border whitespace-nowrap text-red-600">
                           {row.debit > 0 ? row.debit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}
                        </td>
                        <td className={'p-2 border whitespace-nowrap font-bold ' + (row.balance >= 0 ? 'text-green-600' : 'text-red-600')}>{row.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-500 border">
                        لا توجد حركات مالية لهذا المورد.
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
