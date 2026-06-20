'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={handleConfirm}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <ConfirmationButton confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
