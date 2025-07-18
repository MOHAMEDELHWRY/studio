
"use client";

import React, { useState, useMemo } from 'react';
import { useTransactions } from '@/context/transactions-context';
import { governorates } from '@/data/egypt-governorates';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { type DateRange } from 'react-day-picker';
import { Bar, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, TooltipProps } from 'recharts';
import { DollarSign, LineChart, Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const getLabel = (key: string | undefined) => {
        if (key === 'totalSales') return 'المبيعات';
        if (key === 'totalProfit') return 'الأرباح';
        if (key === 'profitPercentage') return 'نسبة الربح';
        return key;
    }
    
    return (
      <div className="p-3 bg-card border rounded-lg shadow-lg">
        <p className="font-bold mb-2 text-card-foreground">{label}</p>
        {payload.map((pld) => (
          <div key={pld.dataKey} style={{ color: pld.color }} className="text-sm flex justify-between items-center gap-4">
            <span>{getLabel(pld.dataKey)}:</span>
            <span className="font-semibold">
              {pld.dataKey === 'profitPercentage'
                ? `${Number(pld.value).toFixed(2)}%`
                : `${Number(pld.value).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const { transactions, expenses } = useTransactions();

  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [groupBy, setGroupBy] = useState<'location' | 'month'>('location');

  const filteredTransactions = useMemo(() => {
    const toDate = dateRange?.to ? new Date(dateRange.to) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999); // Include the whole day
    }

    return transactions.filter(t => {
      const governorateMatch = selectedGovernorate === 'all' || t.governorate === selectedGovernorate;
      const dateMatch =
        !dateRange?.from ||
        (t.date >= dateRange.from && (!toDate || t.date <= toDate));
      return governorateMatch && dateMatch;
    });
  }, [transactions, selectedGovernorate, dateRange]);

  const filteredExpenses = useMemo(() => {
    const toDate = dateRange?.to ? new Date(dateRange.to) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }
    return expenses.filter(e => {
        const dateMatch =
        !dateRange?.from ||
        (e.date >= dateRange.from && (!toDate || e.date <= toDate));
        return dateMatch;
    });
  }, [expenses, dateRange]);


  const { chartData, tableData, groupingKeyHeader } = useMemo(() => {
    const dataMap = new Map<string, {
        name: string, 
        totalSales: number, 
        totalPurchases: number,
        remainingStockValue: number,
        totalTaxesOnSoldItems: number,
        count: number 
    }>();
    let header = 'المجموعة';

    filteredTransactions.forEach(t => {
        let groupKey: string, displayName: string;

        if (groupBy === 'month') {
            header = 'الشهر';
            groupKey = format(t.date, 'yyyy-MM');
            displayName = format(new Date(groupKey + '-02'), 'MMMM yyyy', { locale: ar });
        } else { // groupBy === 'location'
            const isGovSelected = selectedGovernorate !== 'all';
            header = isGovSelected ? 'المركز' : 'المحافظة';
            groupKey = isGovSelected ? (t.city || `(${t.governorate} - غير محدد)`) : t.governorate;
            displayName = groupKey;
        }
        
        if (!dataMap.has(groupKey)) {
            dataMap.set(groupKey, { name: displayName, totalSales: 0, totalPurchases: 0, remainingStockValue: 0, totalTaxesOnSoldItems: 0, count: 0 });
        }
        
        const current = dataMap.get(groupKey)!;
        current.totalSales += t.totalSellingPrice;
        current.totalPurchases += t.totalPurchasePrice;
        current.count += 1;

        if (t.totalSellingPrice > 0) {
            current.totalTaxesOnSoldItems += t.taxes;
        } else {
            current.remainingStockValue += t.totalPurchasePrice;
        }
    });
    
    const sortedEntries = Array.from(dataMap.entries()).sort((a, b) => {
        if (groupBy === 'month') {
            return a[0].localeCompare(b[0]); // Sort by 'YYYY-MM' key
        }
        return b[1].totalSales - a[1].totalSales; // Sort by sales for location
    });

    const finalData = sortedEntries.map(entry => {
        const value = entry[1];
        const costOfGoodsSold = value.totalPurchases - value.remainingStockValue;
        const totalProfit = value.totalSales - costOfGoodsSold - value.totalTaxesOnSoldItems;
        const profitPercentage = value.totalSales > 0 ? (totalProfit / value.totalSales) * 100 : 0;
        
        return {
            name: value.name,
            totalSales: value.totalSales,
            count: value.count,
            totalProfit,
            profitPercentage,
        };
    });
    
    return { chartData: finalData, tableData: finalData, groupingKeyHeader: header };
  }, [filteredTransactions, selectedGovernorate, groupBy]);

  const totalReportStats = useMemo(() => {
    const stats = filteredTransactions.reduce((acc, t) => {
      acc.totalSales += t.totalSellingPrice;
      acc.totalPurchases += t.totalPurchasePrice;
      if (t.totalSellingPrice > 0) {
        acc.totalTaxesOnSoldItems += t.taxes;
      } else {
        acc.remainingStockValue += t.totalPurchasePrice;
      }
      return acc;
    }, { totalSales: 0, totalPurchases: 0, remainingStockValue: 0, totalTaxesOnSoldItems: 0 });

    const totalFilteredExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const costOfGoodsSold = stats.totalPurchases - stats.remainingStockValue;
    const totalProfit = stats.totalSales - costOfGoodsSold - stats.totalTaxesOnSoldItems - totalFilteredExpenses;

    return { totalSales: stats.totalSales, totalProfit };
  }, [filteredTransactions, filteredExpenses]);
  
  const reportTitle = useMemo(() => {
    let titleParts = [];
    if (selectedGovernorate !== 'all') {
      titleParts.push(`لمحافظة ${selectedGovernorate}`);
    }
    if (dateRange?.from) {
      const from = format(dateRange.from, 'd MMM yyyy', { locale: ar });
      const to = dateRange.to ? format(dateRange.to, 'd MMM yyyy', { locale: ar }) : from;
      titleParts.push(`في الفترة من ${from} إلى ${to}`);
    }
    return titleParts.length > 0 ? `(${titleParts.join('، و')})` : '';
  }, [selectedGovernorate, dateRange]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-xl md:text-3xl font-bold text-primary flex items-center gap-2">
            <LineChart className="w-8 h-8" />
            تقارير المبيعات والأرباح
          </h1>
        </div>
        <span className="text-muted-foreground text-sm truncate">{reportTitle}</span>
      </header>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>فلترة التقارير</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="text-sm font-medium mb-2 block">المدة الزمنية</label>
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-right font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "dd MMM yyyy", { locale: ar })} -{" "}
                                    {format(dateRange.to, "dd MMM yyyy", { locale: ar })}
                                </>
                            ) : (
                                format(dateRange.from, "dd MMM yyyy", { locale: ar })
                            )
                        ) : (
                            <span>اختر مدة زمنية</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={ar}
                    />
                </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">تجميع حسب</label>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'location' | 'month')}>
              <SelectTrigger>
                <SelectValue placeholder="تجميع حسب..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">المحافظة/المركز</SelectItem>
                <SelectItem value="month">الشهر</SelectItem>
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
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsla(var(--card) / 0.8)' }}
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
           <Table className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>{groupingKeyHeader}</TableHead>
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
