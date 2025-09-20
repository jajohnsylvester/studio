'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating personalized financial tips based on user spending patterns.
 *
 * It includes:
 * - generateFinancialTips - An async function that takes spending data as input and returns personalized financial tips.
 * - GenerateFinancialTipsInput - The input type for the generateFinancialTips function, defining the expected spending data structure.
 * - GenerateFinancialTipsOutput - The output type for the generateFinancialTips function, defining the structure of the financial tips returned.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFinancialTipsInputSchema = z.object({
  spendingData: z
    .string()
    .describe(
      'A string containing spending data, including categories and amounts spent in each category.'
    ),
});
export type GenerateFinancialTipsInput = z.infer<
  typeof GenerateFinancialTipsInputSchema
>;

const GenerateFinancialTipsOutputSchema = z.object({
  financialTips: z
    .string()
    .describe('Personalized financial tips based on spending patterns.'),
});
export type GenerateFinancialTipsOutput = z.infer<
  typeof GenerateFinancialTipsOutputSchema
>;

export async function generateFinancialTips(
  input: GenerateFinancialTipsInput
): Promise<GenerateFinancialTipsOutput> {
  return generateFinancialTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialTipsPrompt',
  input: {schema: GenerateFinancialTipsInputSchema},
  output: {schema: GenerateFinancialTipsOutputSchema},
  prompt: `You are a financial advisor. Based on the following spending data, provide personalized financial tips to the user.

Spending Data:
{{spendingData}}

Financial Tips:`, 
});

const generateFinancialTipsFlow = ai.defineFlow(
  {
    name: 'generateFinancialTipsFlow',
    inputSchema: GenerateFinancialTipsInputSchema,
    outputSchema: GenerateFinancialTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
