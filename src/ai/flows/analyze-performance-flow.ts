'use server';
/**
 * @fileOverview An AI agent for analyzing financial performance from transaction data.
 *
 * - analyzePerformance - A function that takes transaction data and returns a summary.
 * - PerformanceAnalysisInput - The input type for the analyzePerformance function.
 * - PerformanceAnalysisOutput - The return type for the analyzePerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TransactionSchemaForAI = z.object({
  date: z.string().describe('The date of the transaction in ISO format.'),
  supplierName: z.string(),
  governorate: z.string(),
  city: z.string(),
  totalSellingPrice: z.number(),
  profit: z.number(),
});

const PerformanceAnalysisInputSchema = z.object({
  transactions: z.array(TransactionSchemaForAI).describe('A list of all financial transactions to be analyzed.'),
  totalProfit: z.number().describe('The total net profit after all expenses.'),
  totalExpenses: z.number().describe('The total amount of all expenses.'),
});
export type PerformanceAnalysisInput = z.infer<typeof PerformanceAnalysisInputSchema>;

const PerformanceAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A detailed financial analysis summary in Arabic markdown format.'),
});
export type PerformanceAnalysisOutput = z.infer<typeof PerformanceAnalysisOutputSchema>;

export async function analyzePerformance(input: PerformanceAnalysisInput): Promise<PerformanceAnalysisOutput> {
  return analyzePerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePerformancePrompt',
  input: {schema: PerformanceAnalysisInputSchema},
  output: {schema: PerformanceAnalysisOutputSchema},
  prompt: `أنت محلل مالي خبير. مهمتك هي تحليل بيانات المعاملات المالية التالية وتقديم تقرير موجز وذكي باللغة العربية.

يجب أن يكون تحليلك على شكل نقاط واضحة باستخدام Markdown، وأن يغطي الجوانب التالية:

1.  **نظرة عامة على الأداء**: ابدأ بملخص عام للأداء المالي، مع الإشارة إلى إجمالي الأرباح والمصروفات.
2.  **الموردون الأعلى أداءً**: حدد الموردين الذين حققوا أعلى أرباح. اذكر أفضل 3 موردين مع أرباح كل منهم.
3.  **المناطق الجغرافية الأكثر مبيعًا**: حدد المحافظات أو المدن التي تحقق أعلى مبيعات. اذكر أفضل 3 مناطق مع إجمالي مبيعاتها.
4.  **رؤى واقتراحات**: بناءً على تحليلك، قدم رؤى قابلة للتنفيذ. على سبيل المثال، هل هناك موردون أداؤهم ضعيف؟ هل هناك فرص للنمو في مناطق معينة؟ قدم توصيتين على الأقل لتحسين الأداء.

إجمالي صافي الربح (بعد خصم المصروفات): {{{totalProfit}}}
إجمالي المصروفات: {{{totalExpenses}}}

بيانات المعاملات للتحليل:
\`\`\`json
{{{json transactions}}}
\`\`\`

اكتب التقرير بالكامل باللغة العربية.`,
});


const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: PerformanceAnalysisInputSchema,
    outputSchema: PerformanceAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return { analysis: "لم يتمكن الذكاء الاصطناعي من إنشاء تحليل. قد تكون هناك مشكلة مؤقتة. يرجى المحاولة مرة أخرى لاحقًا." };
    }
    return output;
  }
);
