import type { NewStudent, NewTrainer, Student, Trainer } from '@muvit/db/schema';

export interface AuthRepository {
  findTrainerByEmail(email: string): Promise<Trainer | null>;
  createTrainer(input: Pick<NewTrainer, 'name' | 'email' | 'passwordHash'>): Promise<Trainer>;
  findStudentByEmail(email: string): Promise<Student | null>;
  createIndependentStudent(
    input: Pick<NewStudent, 'name' | 'email' | 'passwordHash' | 'isIndependent'>,
  ): Promise<Student>;
  findTrainerById(id: string): Promise<Trainer | null>;
  findStudentById(id: string): Promise<Student | null>;
  completeTrainerOnboarding(id: string, onboardedAt: Date): Promise<Date>;
}
