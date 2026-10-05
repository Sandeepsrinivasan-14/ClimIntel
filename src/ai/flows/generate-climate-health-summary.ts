'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateClimateHealthSummaryInputSchema = z.object({
  region: z.string().describe('The Indian region to analyze.'),
  timePeriod: z.string().describe('The time period to analyze (e.g., "2023-Q4").'),
  weatherData: z.string().describe('Weather data for the specified region and time period.'),
  diseaseCaseData: z.string().describe('Disease case data for the specified region and time period.'),
});

export type GenerateClimateHealthSummaryInput = z.infer<typeof GenerateClimateHealthSummaryInputSchema>;

const GenerateClimateHealthSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the relationships between climate variables and disease trends.'),
  recommendations: z.array(z.string()).describe('A list of 2-3 actionable public health recommendations based on the analysis. Each recommendation should be a concise sentence.'),
});

export type GenerateClimateHealthSummaryOutput = z.infer<typeof GenerateClimateHealthSummaryOutputSchema>;

export async function generateClimateHealthSummary(input: GenerateClimateHealthSummaryInput): Promise<GenerateClimateHealthSummaryOutput> {
  return generateClimateHealthSummaryFlow(input);
}

const generateClimateHealthSummaryPrompt = ai.definePrompt({
  name: 'generateClimateHealthSummaryPrompt',
  input: {schema: GenerateClimateHealthSummaryInputSchema},
  output: {schema: GenerateClimateHealthSummaryOutputSchema},
  prompt: `You are an expert public health AI specializing in climate and health data in India.
  Analyze the provided weather and disease case data for the specified region and time period.
  Base your analysis only on the figures given below, and refer to the correlation values when you
  describe how weather relates to cases. Do not invent numbers that are not in the data.

  1.  First, generate a concise summary (3-4 sentences) of the observed weather and disease patterns and how they relate.
  2.  Then, provide a list of 2-3 specific, actionable public health recommendations based on your analysis to mitigate risks.

  Region: {{{region}}}
  Time Period: {{{timePeriod}}}
  Weather Data: {{{weatherData}}}
  Disease Case Data: {{{diseaseCaseData}}}
`,
});

const generateClimateHealthSummaryFlow = ai.defineFlow(
  {
    name: 'generateClimateHealthSummaryFlow',
    inputSchema: GenerateClimateHealthSummaryInputSchema,
    outputSchema: GenerateClimateHealthSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateClimateHealthSummaryPrompt(input);
    return output!;
  }
);
