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
  const { transactions, balanceTransfers, supplierPayments } = useTransactions();

  const supplierName = useMemo(() => {
    const name = params.supplierName;
    return typeof name === 'string' ? decodeURIComponent(name) : '';
  }, [params.supplierName]);
  
  const { 
    transactionsWithBalances, 
    supplierStats, 
    tonBreakdown, 
    finalSalesBalance, 
    finalCashFlowBalance, 
    finalFactoryBalance,
    supplierRelatedTransfers
  } = useMemo(() => {
    if (!supplierName) {
      return {
        transactionsWithBalances: [],
        supplierStats: { totalPurchases: 0, totalSales: 0, totalPaidToFactory: 0, totalReceivedFromSupplier: 0, totalTonsPurchased: 0, totalTonsSold: 0 },
        tonBreakdown: { byCategory: {}, byVariety: {} },
        finalSalesBalance: 0,
        finalCashFlowBalance: 0,
        finalFactoryBalance: 0,
        supplierRelatedTransfers: []
      };
    }

    // --- 1. Filter data for the current supplier ---
    const supplierTransactions = transactions.filter(t => t.supplierName === supplierName);
    const relatedTransfers = balanceTransfers.filter(t => t.fromSupplier === supplierName || t.toSupplier === supplierName);
    const relatedSalesPayments = supplierPayments.filter(p => p.supplierName === supplierName && p.classification !== 'سداد للمصنع عن المورد');
    const relatedFactoryPayments = supplierPayments.filter(p => p.supplierName === supplierName && p.classification === 'سداد للمصنع عن المورد');

    // --- 2. Calculate static stats (like tons and totals for cards) ---
    const stats = { 
      totalPurchases: 0, totalSales: 0, totalPaidToFactory: 0, totalReceivedFromSupplier: 0,
      totalTonsPurchased: 0, totalTonsSold: 0
    };
    const breakdown: {
        byCategory: { [key: string]: { purchased: number; sold: number } },
        byVariety: { [key: string]: { purchased: number; sold: number } }
    } = { byCategory: {}, byVariety: {} };

    supplierTransactions.forEach(t => {
      stats.totalPurchases += t.totalPurchasePrice;
      stats.totalSales += t.totalSellingPrice;
      stats.totalTonsPurchased += t.quantity;
      const isSold = t.totalSellingPrice > 0;
      if (isSold) stats.totalTonsSold += t.quantity;
      if (t.category) {
          if (!breakdown.byCategory[t.category]) breakdown.byCategory[t.category] = { purchased: 0, sold: 0 };
          breakdown.byCategory[t.category].purchased += t.quantity;
          if (isSold) breakdown.byCategory[t.category].sold += t.quantity;
      }
      if (t.variety) {
          if (!breakdown.byVariety[t.variety]) breakdown.byVariety[t.variety] = { purchased: 0, sold: 0 };
          breakdown.byVariety[t.variety].purchased += t.quantity;
          if (isSold) breakdown.byVariety[t.variety].sold += t.quantity;
      }
    });

    // --- 3. Combine all events into a single chronological timeline ---
    const combinedEvents = [
        ...supplierTransactions.map(t => ({ id: t.id, date: t.date, type: 'transaction', payload: t })),
        ...relatedTransfers.map(t => ({ id: t.id, date: t.date, type: 'transfer', payload: t })),
        ...relatedSalesPayments.map(p => ({ id: p.id, date: p.date, type: 'sales_payment', payload: p })),
        ...relatedFactoryPayments.map(p => ({ id: p.id, date: p.date, type: 'factory_payment', payload: p })),
    ].sort((a,b) => {
        const dateA = a.date.getTime();
        const dateB = b.date.getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
    });

    // --- 4. Calculate running balances ---
    let runningSales = 0, runningCash = 0, runningFactory = 0;
    const eventBalances = new Map<string, { sales: number; cash: number; factory: number }>();
    
    combinedEvents.forEach(event => {
        if (event.type === 'transaction') {
            const t = event.payload;
            runningSales += t.amountReceivedFromSupplier - t.totalSellingPrice;
            runningFactory += t.amountPaidToFactory - t.totalPurchasePrice;
        } else if (event.type === 'transfer') {
            const amount = event.payload.toSupplier === supplierName ? event.payload.amount : -event.payload.amount;
            runningSales += amount;
        } else if (event.type === 'sales_payment') {
            runningSales -= event.payload.amount;
        } else if (event.type === 'factory_payment') {
            runningFactory += event.payload.amount;
        }
        runningCash = runningSales - runningFactory;
        eventBalances.set(event.id, { sales: runningSales, cash: runningCash, factory: runningFactory });
    });

    // --- 5. Prepare data for display ---
    const transactionsWithBalances = supplierTransactions
      .map(t => {
        const balances = eventBalances.get(t.id) || { sales: 0, cash: 0, factory: 0 };
        return { 
            ...t, 
            salesRunningBalance: balances.sales, 
            cashFlowRunningBalance: balances.cash, 
            factoryRunningBalance: balances.factory 
        };
      })
      .sort((a,b) => {
          const dateA = a.date.getTime();
          const dateB = b.date.getTime();
          if (dateA !== dateB) return b.date.getTime() - a.date.getTime();
          return b.id.localeCompare(a.id);
      });

    // Update the main `stats` object with final balances for the summary cards
    stats.totalReceivedFromSupplier = runningSales + stats.totalSales;
    stats.totalPaidToFactory = runningFactory + stats.totalPurchases;
    
    return { 
      transactionsWithBalances, 
      supplierStats: stats, 
      tonBreakdown,
      finalSalesBalance: runningSales,
      finalCashFlowBalance: runningCash,
      finalFactoryBalance: runningFactory,
      supplierRelatedTransfers: relatedTransfers.sort((a, b) => b.date.getTime() - a.date.getTime())
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
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المستلم (بعد الدفعات)</h3>
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

        {supplierRelatedTransfers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">سجل التحويلات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-right border-collapse border">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 border font-semibold text-gray-700">التاريخ</th>
                      <th className="p-2 border font-semibold text-gray-700">البيان</th>
                      <th className="p-2 border font-semibold text-gray-700">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierRelatedTransfers.map(t => (
                      <tr key={t.id}>
                          <td className="p-2 border whitespace-nowrap">{format(t.date, 'dd-MM-yyyy', { locale: ar })}</td>
                          <td className="p-2 border">
                            {t.fromSupplier === supplierName 
                              ? `تحويل إلى ${t.toSupplier}`
                              : `تحويل من ${t.fromSupplier}`
                            }
                          </td>
                           <td className={'p-2 border whitespace-nowrap font-bold ' + (t.toSupplier === supplierName ? 'text-green-600' : 'text-red-600')}>
                              {t.toSupplier === supplierName ? '+' : '-'}
                              {t.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                           </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">ملخص الأطنان</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right border-collapse border">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 border font-semibold text-gray-700">الصنف / النوع</th>
                    <th className="p-2 border font-semibold text-gray-700">إجمالي المشتراة</th>
                    <th className="p-2 border font-semibold text-gray-700">إجمالي المباعة</th>
                    <th className="p-2 border font-semibold text-gray-700">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold bg-gray-100">
                    <td className="p-2 border">الإجمالي الكلي</td>
                    <td className="p-2 border">{supplierStats.totalTonsPurchased.toLocaleString('ar-EG')} طن</td>
                    <td className="p-2 border">{supplierStats.totalTonsSold.toLocaleString('ar-EG')} طن</td>
                    <td className="p-2 border">{(supplierStats.totalTonsPurchased - supplierStats.totalTonsSold).toLocaleString('ar-EG')} طن</td>
                  </tr>
                  {Object.entries(tonBreakdown.byCategory).map(([category, data]) => (
                    <tr key={category} className="border-b hover:bg-gray-50">
                      <td className="p-2 border">{category}</td>
                      <td className="p-2 border">{data.purchased.toLocaleString('ar-EG')} طن</td>
                      <td className="p-2 border">{data.sold.toLocaleString('ar-EG')} طن</td>
                      <td className="p-2 border">{(data.purchased - data.sold).toLocaleString('ar-EG')} طن</td>
                    </tr>
                  ))}
                  {Object.entries(tonBreakdown.byVariety).map(([variety, data]) => (
                    <tr key={variety} className="border-b hover:bg-gray-50">
                      <td className="p-2 border">نوع {variety}</td>
                      <td className="p-2 border">{data.purchased.toLocaleString('ar-EG')} طن</td>
                      <td className="p-2 border">{data.sold.toLocaleString('ar-EG')} طن</td>
                      <td className="p-2 border">{(data.purchased - data.sold).toLocaleString('ar-EG')} طن</td>
                    </tr>
                  ))}
                  {Object.keys(tonBreakdown.byCategory).length === 0 && Object.keys(tonBreakdown.byVariety).length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-500 border">
                        لا توجد تفاصيل أصناف أو أنواع مسجلة.
                      </td>
                    </tr>
                  )}
                </tbody>
            </table>
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
                    <th className="p-2 border font-semibold text-gray-700">المنطقة</th>
                    <th className="p-2 border font-semibold text-gray-700">الكمية / التفاصيل</th>
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
                        <td className="p-2 border whitespace-nowrap">{[t.governorate, t.city].filter(Boolean).join(' - ')}</td>
                        <td className="p-2 border whitespace-nowrap">{`${t.quantity.toLocaleString('ar-EG')} طن`}{(t.category || t.variety) ? ` (${[t.category, t.variety].filter(Boolean).join(' / ')})` : ''}</td>
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
                      <td colSpan={11} className="p-12 text-center text-gray-500 border">
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
