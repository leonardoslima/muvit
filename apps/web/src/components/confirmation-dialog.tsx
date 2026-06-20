'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

interface ConfirmationDialogProps {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  confirmAction: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
}

interface ConfirmationButtonProps {
  confirmLabel: string;
  pendingLabel: string;
}

function ConfirmationButton({ confirmLabel, pendingLabel }: ConfirmationButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  confirmAction,
  hiddenFields = {},
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm(formData: FormData) {
    await confirmAction(formData);
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleConfirm}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <ConfirmationButton confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
