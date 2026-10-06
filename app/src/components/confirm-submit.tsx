"use client";

type ConfirmSubmitProps = {
  action: (formData: FormData) => Promise<never>;
  fieldName: string;
  fieldValue: string;
  label: string;
  confirmation: string;
  className?: string;
  hiddenFields?: Record<string, string>;
};

export default function ConfirmSubmit({
  action,
  fieldName,
  fieldValue,
  label,
  confirmation,
  className,
  hiddenFields,
}: ConfirmSubmitProps) {
  return (
    <form action={action}>
      <input type="hidden" name={fieldName} value={fieldValue} />
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        className={className}
        type="submit"
        onClick={(event) => {
          if (!window.confirm(confirmation)) event.preventDefault();
        }}
      >
        {label}
      </button>
    </form>
  );
}