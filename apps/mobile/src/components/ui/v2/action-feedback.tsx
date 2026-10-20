import { useEffect, useRef } from 'react';
import { Message, type MessageProps } from './message';
import { useToast } from './toast';

export type ActionFeedbackProps = MessageProps & { eventKey?: string | number; inline?: boolean };

export function ActionFeedback({
  inline = false,
  eventKey,
  ...props
}: ActionFeedbackProps): React.JSX.Element | null {
  return props.variant === 'error' && !inline ? (
    <ErrorToast {...props} eventKey={eventKey} />
  ) : (
    <Message {...props} />
  );
}

function ErrorToast({ title, description, action, testID, eventKey }: ActionFeedbackProps): null {
  const { show, dismiss } = useToast();
  const actionRef = useRef(action);
  actionRef.current = action;
  const label = action?.label;
  const disabled = action?.disabled;
  const loading = action?.loading;

  useEffect(() => {
    const id = show({
      eventKey,
      title,
      description,
      testID,
      action: label
        ? { label, disabled, loading, onPress: () => actionRef.current?.onPress() }
        : undefined,
    });
    return () => dismiss(id);
  }, [title, description, testID, eventKey, label, disabled, loading, show, dismiss]);
  return null;
}
