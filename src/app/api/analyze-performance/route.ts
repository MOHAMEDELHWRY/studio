import { NextRequest, NextResponse } from 'next/server';
import { analyzePerformance, type PerformanceAnalysisInput } from '@/ai/flows/analyze-performance-flow';

export async function POST(request: NextRequest) {
  try {
    const body: PerformanceAnalysisInput = await request.json();
    
    // Validate the input
    if (!body.transactions || !Array.isArray(body.transactions)) {
      return NextResponse.json(
        { error: 'Invalid input: transactions array is required' },
        { status: 400 }
      );
    }

    if (typeof body.totalProfit !== 'number' || typeof body.totalExpenses !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: totalProfit and totalExpenses must be numbers' },
        { status: 400 }
      );
    }

    const result = await analyzePerformance(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in analyze-performance:', error);
    
    // Return a user-friendly error message in Arabic
    return NextResponse.json(
      { 
        analysis: "حدث خطأ أثناء تحليل البيانات. يرجى التأكد من صحة إعدادات الذكاء الاصطناعي والمحاولة مرة أخرى." 
      },
      { status: 500 }
    );
  }
}
