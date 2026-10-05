
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Disease } from '@/lib/types';
import { ShieldCheck, ListChecks, Info } from 'lucide-react';

interface DiseaseInfoProps {
  disease: Disease | undefined;
}

export function DiseaseInfo({ disease }: DiseaseInfoProps) {
  if (!disease) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
            <Info className="h-5 w-5 text-muted-foreground" /> About {disease.name.toLowerCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{disease.description}</p>
        <p className="text-sm">
          <span className="rounded-full bg-foreground/5 px-2.5 py-1">{disease.transmission === 'vector' ? 'Spread by mosquitoes' : 'Spread through contaminated water and food'}</span>
        </p>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2 text-sm">
              <ListChecks className="h-5 w-5 text-[hsl(var(--chart-1))]" />
              Common symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {disease.symptoms.map((symptom) => (
                <Badge key={symptom} variant="secondary" className="font-normal">{symptom}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2 text-sm">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Prevention
            </h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {disease.prevention.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
