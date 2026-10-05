'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ArchivedSummary, AiSummary } from '@/lib/types';

interface AiSummaryArchiveProps {
  currentSummary: AiSummary | null;
  archivedSummaries: ArchivedSummary[];
  onArchive: () => void;
}

export function AiSummaryArchive({
  currentSummary,
  archivedSummaries,
  onArchive,
}: AiSummaryArchiveProps) {
  const hasContent = currentSummary && (currentSummary.summary || (currentSummary.recommendations && currentSummary.recommendations.length > 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Archive className="h-5 w-5" />
          Saved insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/10 bg-foreground/[0.03] p-4 space-y-4">
          <div>
            <h4 className="font-semibold">Latest insight</h4>
            <p className="text-sm text-muted-foreground min-h-[40px] mt-1">
              {currentSummary?.summary || 'Generate an insight from the sidebar, then save it here to compare later.'}
            </p>
          </div>
          {currentSummary?.recommendations && currentSummary.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Recommendations
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                {currentSummary.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={onArchive} disabled={!hasContent}>
            <Archive className="mr-2 h-4 w-4" />
            Save insight
          </Button>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Saved</h4>
          <ScrollArea className="h-64">
            <div className="space-y-4 pr-6">
              {archivedSummaries.length > 0 ? (
                [...archivedSummaries].sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()).map((item) => (
                  <div key={item.id} className="text-sm p-3 bg-foreground/5 rounded-xl border border-border/10 space-y-3">
                    <div>
                        <p className="font-bold">
                          {item.regionName} - {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-muted-foreground my-1">{item.summary}</p>
                        <p className="text-xs text-muted-foreground/80">
                          Archived: {new Date(item.archivedAt).toLocaleString()}
                        </p>
                    </div>
                    {item.recommendations && item.recommendations.length > 0 && (
                         <div>
                            <h5 className="font-semibold mb-2 flex items-center gap-2 text-xs">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Recommendations
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {item.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                         </div>
                     )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Insights you save appear here.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
