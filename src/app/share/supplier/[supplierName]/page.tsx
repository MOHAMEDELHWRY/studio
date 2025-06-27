"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTransactions } from '@/context/transactions-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function ShareableSupplierReport() {
  const params = useParams();
  const { transactions } = useTransactions();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);

  const supplierTransactionsAsc = useMemo(() => {
    if (!supplierName) return [];
    return transactions
      .filter(t => t.supplierName === supplierName)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [transactions, supplierName]);
  
  const transactionsWithBalances = useMemo(() => {
    let salesBalance = 0;
    let cashFlowBalance = 0;
    let factoryBalance = 0;
    return supplierTransactionsAsc.map(t => {
      salesBalance += t.amountReceivedFromSupplier - t.totalSellingPrice;
      cashFlowBalance += t.amountReceivedFromSupplier - t.amountPaidToFactory;
      factoryBalance += t.amountPaidToFactory - t.totalPurchasePrice;
      return { ...t, salesRunningBalance: salesBalance, cashFlowRunningBalance: cashFlowBalance, factoryRunningBalance: factoryBalance };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [supplierTransactionsAsc]);

  const supplierStats = useMemo(() => {
    return supplierTransactionsAsc.reduce((acc, t) => {
      acc.totalPurchases += t.totalPurchasePrice;
      acc.totalSales += t.totalSellingPrice;
      acc.totalPaidToFactory += t.amountPaidToFactory;
      acc.totalReceivedFromSupplier += t.amountReceivedFromSupplier;
      return acc;
    }, { totalPurchases: 0, totalSales: 0, totalPaidToFactory: 0, totalReceivedFromSupplier: 0 });
  }, [supplierTransactionsAsc]);

  const finalSalesBalance = transactionsWithBalances.length > 0 ? transactionsWithBalances[0].salesRunningBalance : 0;
  const finalCashFlowBalance = transactionsWithBalances.length > 0 ? transactionsWithBalances[0].cashFlowRunningBalance : 0;
  const finalFactoryBalance = transactionsWithBalances.length > 0 ? transactionsWithBalances[0].factoryRunningBalance : 0;

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">تقرير المورد: {supplierName}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">تم إنشاؤه في: {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: ar })}</p>
        </div>
        <Button onClick={() => window.print()} className="no-print" variant="outline">
            <Printer className="ml-2 h-4 w-4" />
            طباعة / PDF
        </Button>
      </header>
      
      <div className="printable-content">
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">ملخص الحسابات</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المشتريات</h3>
                  <p className="text-base sm:text-xl font-bold text-gray-800">{supplierStats.totalPurchases.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المبيعات</h3>
                  <p className="text-base sm:text-xl font-bold text-gray-800">{supplierStats.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
               <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المستلم من المورد</h3>
                  <p className="text-base sm:text-xl font-bold text-green-600">{supplierStats.totalReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">رصيد المبيعات النهائي</h3>
                  <p className={'text-base sm:text-xl font-bold ' + (finalSalesBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{finalSalesBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">الرصيد النقدي النهائي</h3>
                  <p className={'text-base sm:text-xl font-bold ' + (finalCashFlowBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{finalCashFlowBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
              <div className="p-2 sm:p-4 border rounded-lg">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">رصيد لدى المصنع</h3>
                  <p className={'text-base sm:text-xl font-bold ' + (finalFactoryBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{finalFactoryBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
              </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4 border-b pb-2">سجل العمليات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right border-collapse border">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 border font-semibold text-gray-700">التاريخ</th>
                    <th className="p-2 border font-semibold text-gray-700">الوصف</th>
                    <th className="p-2 border font-semibold text-gray-700">إجمالي الشراء</th>
                    <th className="p-2 border font-semibold text-gray-700">إجمالي البيع</th>
                    <th className="p-2 border font-semibold text-gray-700">المدفوع للمصنع</th>
                    <th className="p-2 border font-semibold text-gray-700">المستلم من المورد</th>
                    <th className="p-2 border font-semibold text-gray-700">رصيد المبيعات</th>
                    <th className="p-2 border font-semibold text-gray-700">الرصيد النقدي</th>
                    <th className="p-2 border font-semibold text-gray-700">رصيد لدى المصنع</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalances.length > 0 ? (
                    transactionsWithBalances.map(t => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 border whitespace-nowrap">{format(t.date, 'dd-MM-yyyy', { locale: ar })}</td>
                        <td className="p-2 border font-medium">{t.description}</td>
                        <td className="p-2 border whitespace-nowrap">{t.totalPurchasePrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className="p-2 border whitespace-nowrap">
                          {t.totalSellingPrice > 0 ? (
                            t.totalSellingPrice.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
                          ) : (
                            <span className="text-gray-500">لم يتم البيع</span>
                          )}
                        </td>
                        <td className="p-2 border whitespace-nowrap text-blue-600">{t.amountPaidToFactory.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className="p-2 border whitespace-nowrap text-green-600">{t.amountReceivedFromSupplier.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className={'p-2 border whitespace-nowrap font-bold ' + (t.salesRunningBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{t.salesRunningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className={'p-2 border whitespace-nowrap font-bold ' + (t.cashFlowRunningBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{t.cashFlowRunningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                        <td className={'p-2 border whitespace-nowrap font-bold ' + (t.factoryRunningBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{t.factoryRunningBalance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-gray-500 border">
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
