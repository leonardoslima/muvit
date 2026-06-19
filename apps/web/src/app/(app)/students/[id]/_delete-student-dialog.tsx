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
import { Trash2 } from 'lucide-react';

interface DeleteStudentDialogProps {
  studentId: string;
  studentName: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteStudentDialog({
  studentId,
  studentName,
  deleteAction,
}: DeleteStudentDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="icon" aria-label="Excluir aluno" />}
      >
        <Trash2 />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir aluno?</DialogTitle>
          <DialogDescription>
            Você está prestes a excluir {studentName}. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={studentId} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" variant="destructive">
              Excluir aluno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
