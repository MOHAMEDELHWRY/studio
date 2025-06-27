
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transactions-context';
import { governorates } from '@/data/egypt-governorates';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Bar, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line } from 'recharts';
import { ArrowRight, DollarSign, LineChart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
  const { transactions } = useTransactions();

  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => months.add(format(t.date, 'yyyy-MM')));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const governorateMatch = selectedGovernorate === 'all' || t.governorate === selectedGovernorate;
      const monthMatch = selectedMonth === 'all' || format(t.date, 'yyyy-MM') === selectedMonth;
      return governorateMatch && monthMatch;
    });
  }, [transactions, selectedGovernorate, selectedMonth]);

  const { chartData, tableData, groupingKey } = useMemo(() => {
    let key: 'governorate' | 'city' | 'month' = 'governorate';
    if (selectedGovernorate !== 'all' && selectedMonth === 'all') {
        key = 'month';
    } else if (selectedGovernorate !== 'all' && selectedMonth !== 'all') {
        key = 'city';
    } else if (selectedGovernorate === 'all' && selectedMonth !== 'all') {
        key = 'governorate';
    } else { // both 'all'
        key = 'governorate';
    }

    const dataMap = new Map<string, { name: string, totalSales: number, totalProfit: number, count: number, profitPercentage: number }>();

    filteredTransactions.forEach(t => {
      let groupName: string;
      if (key === 'month') {
        groupName = format(t.date, 'MMMM yyyy', { locale: ar });
      } else {
        groupName = t[key] || 'غير محدد';
        if (key === 'city' && groupName === 'غير محدد') groupName = `(${t.governorate} - غير محدد)`
      }

      if (!dataMap.has(groupName)) {
        dataMap.set(groupName, { name: groupName, totalSales: 0, totalProfit: 0, count: 0, profitPercentage: 0 });
      }
      const current = dataMap.get(groupName)!;
      current.totalSales += t.totalSellingPrice;
      current.totalProfit += t.profit;
      current.count += 1;
    });
    
    // Calculate percentage after aggregation
    for (const value of dataMap.values()) {
        value.profitPercentage = value.totalSales > 0 ? (value.totalProfit / value.totalSales) * 100 : 0;
    }

    const sortedData = Array.from(dataMap.values()).sort((a, b) => b.totalSales - a.totalSales);
    return { chartData: sortedData, tableData: sortedData, groupingKey: key };
  }, [filteredTransactions, selectedGovernorate, selectedMonth]);

  const totalReportStats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      acc.totalSales += t.totalSellingPrice;
      acc.totalProfit += t.profit;
      return acc;
    }, { totalSales: 0, totalProfit: 0 });
  }, [filteredTransactions]);
  
  const getGroupingKeyHeader = () => {
    switch(groupingKey) {
        case 'governorate': return 'المحافظة';
        case 'city': return 'المركز';
        case 'month': return 'الشهر';
        default: return 'المجموعة';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <LineChart className="w-8 h-8" />
          تقارير المبيعات والأرباح
        </h1>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowRight className="ml-2 h-4 w-4" /> العودة للوحة التحكم
          </Link>
        </Button>
      </header>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>فلترة التقارير</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">المحافظة</label>
            <Select value={selectedGovernorate} onValueChange={setSelectedGovernorate}>
              <SelectTrigger>
                <SelectValue placeholder="اختر محافظة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحافظات</SelectItem>
                {governorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">الشهر</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="اختر شهرًا" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الشهور</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(month + '-02'), 'MMMM yyyy', { locale: ar })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات (حسب الفلتر)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReportStats.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح (حسب الفلتر)</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReportStats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalReportStats.totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>الرسم البياني للمبيعات والأرباح</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 50, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact' }).format(value as number)} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" tickFormatter={(value) => `${Math.round(value as number)}%`} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'profitPercentage') {
                      return [`${(value as number).toFixed(2)}%`, 'نسبة الربح'];
                    }
                    return [
                      (value as number).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }),
                      name === 'totalSales' ? 'المبيعات' : 'الأرباح'
                    ]
                  }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} payload={[
                    { value: 'المبيعات', type: 'square', id: 'totalSales', color: 'hsl(var(--primary))' },
                    { value: 'الأرباح', type: 'square', id: 'totalProfit', color: 'hsl(var(--success))' },
                    { value: 'نسبة الربح', type: 'line', id: 'profitPercentage', color: 'hsl(var(--accent))' }
                ]} />
                <Bar yAxisId="left" dataKey="totalSales" fill="hsl(var(--primary))" name="المبيعات" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="totalProfit" fill="hsl(var(--success))" name="الأرباح" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="profitPercentage" name="نسبة الربح" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-96 flex items-center justify-center text-muted-foreground">لا توجد بيانات لعرضها.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>البيانات التفصيلية</CardTitle>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{getGroupingKeyHeader()}</TableHead>
                <TableHead>إجمالي المبيعات</TableHead>
                <TableHead>صافي الربح</TableHead>
                <TableHead>نسبة الربح</TableHead>
                <TableHead>عدد العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length > 0 ? (
                tableData.map(item => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                    <TableCell className={item.totalProfit >= 0 ? 'text-success' : 'text-destructive'}>
                        {item.totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell>
                      {`${item.profitPercentage.toFixed(1)}%`}
                    </TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    لا توجد بيانات تطابق الفلتر المحدد.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
