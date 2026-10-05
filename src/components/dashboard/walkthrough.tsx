
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  step: number;
  setStep: (step: number) => void;
  steps: { title: string; description: string }[];
}

export function Walkthrough({ isOpen, onClose, step, setStep, steps }: WalkthroughProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const currentStep = steps[step];
  const isFirstStep = step === 0;
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center my-4">
            <span className="text-sm text-muted-foreground">
                Step {step + 1} of {steps.length}
            </span>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
            <div>
              {!isFirstStep && (
                  <Button variant="outline" onClick={handlePrev}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" onClick={onClose}>Skip</Button>
                <Button onClick={handleNext}>
                    {isLastStep ? 'Finish' : 'Next'}
                    {!isLastStep && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
