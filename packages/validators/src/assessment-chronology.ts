export type AssessmentDateContext = { date: string; dateAssessmentCount: number };

export function isAssessmentDateAmbiguous(item: AssessmentDateContext): boolean {
  return item.dateAssessmentCount > 1;
}

export function canCompareAssessmentDates(
  current: AssessmentDateContext,
  previous: AssessmentDateContext,
): boolean {
  return (
    current.dateAssessmentCount === 1 &&
    previous.dateAssessmentCount === 1 &&
    current.date > previous.date
  );
}
