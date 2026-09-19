import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Accessible field-level error indicator for forms and input fields
 */
export default function FieldError({ error, id, className }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error?.message || String(error);

  return (
    <div
      id={id}
      role="alert"
      className={cn('flex items-center gap-1.5 mt-1 text-xs text-rose-400 font-sans select-none', className)}
    >
      <AlertCircle size={12} className="shrink-0 text-rose-400" />
      <span className="leading-normal">{errorMessage}</span>
    </div>
  );
}

