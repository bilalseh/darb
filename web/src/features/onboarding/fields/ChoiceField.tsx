import type { UseFormRegisterReturn } from 'react-hook-form';

interface Choice {
  value: string;
  label: string;
  hint: string;
}

interface ChoiceFieldProps {
  legend: string;
  choices: readonly Choice[];
  registration: UseFormRegisterReturn;
  errorId: string;
  invalid: boolean;
}

/** A radio group shown as cards. Native radios keep keyboard and screen reader support. */
export function ChoiceField({ legend, choices, registration, errorId, invalid }: ChoiceFieldProps) {
  return (
    <fieldset aria-describedby={invalid ? errorId : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="flex cursor-pointer gap-3 rounded-lg border border-stone-300 bg-white p-4 hover:border-brand-600 has-checked:border-brand-700 has-checked:bg-brand-50"
          >
            <input
              type="radio"
              value={choice.value}
              className="mt-1 size-4 accent-brand-700"
              {...registration}
            />
            <span>
              <span className="block font-semibold">{choice.label}</span>
              <span className="block text-sm text-stone-600">{choice.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
