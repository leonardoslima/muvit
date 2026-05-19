import { TopBar } from '@/components/top-bar';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { completeOnboardingAction } from './actions';

export default function OnboardingPage() {
  return (
    <>
      <TopBar title="Onboarding" subtitle="Configure o essencial para atender o primeiro aluno." />
      <OnboardingWizard completeAction={completeOnboardingAction} />
    </>
  );
}
