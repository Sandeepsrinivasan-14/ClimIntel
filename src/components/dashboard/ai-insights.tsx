'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle, KeyRound } from 'lucide-react';
import { getAiSummary } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { AiSummary } from '@/lib/types';

interface AiInsightsProps {
  regionId: string;
  diseaseId: string;
  date: Date;
  onSummaryGenerated: (summary: AiSummary) => void;
}

export function AiInsights({ regionId, diseaseId, date, onSummaryGenerated }: AiInsightsProps) {
  const [localSummary, setLocalSummary] = useState<AiSummary | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setLocalSummary(null);
    setSetupMessage(null);
    onSummaryGenerated({ summary: '', recommendations: [] });

    const result = await getAiSummary({ regionId, diseaseId, date: date.toISOString() });
    setLoading(false);

    if (!result.ok) {
      if (result.error.includes('GEMINI_API_KEY')) {
        setSetupMessage(result.error);
      } else {
        toast({ variant: 'destructive', title: 'Error Generating Insight', description: result.error });
      }
      return;
    }
    setLocalSummary(result.data);
    onSummaryGenerated(result.data);
  };

  return (
    <div className="group-data-[collapsible=icon]:hidden p-2">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-foreground" />
        AI Insight Generator
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Summarises the weather and case figures for Filter Set A and suggests public health actions.
      </p>
      <Button onClick={handleGenerate} disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        {loading ? 'Analyzing Data...' : 'Generate Insights'}
      </Button>
      {setupMessage && (
        <div className="mt-4 flex gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <KeyRound className="h-4 w-4 shrink-0" />
          <p>{setupMessage}</p>
        </div>
      )}
      {loading && (
        <div className="space-y-2 mt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}
      {localSummary && localSummary.summary && (
        <div className="mt-4 text-sm p-3 bg-foreground/5 rounded-xl border border-border/10 space-y-3">
          <div>
            <h4 className="font-semibold mb-1">Generated Insight:</h4>
            <p>{localSummary.summary}</p>
          </div>
          {localSummary.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Recommendations
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {localSummary.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
