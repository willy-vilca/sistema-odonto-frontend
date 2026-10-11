export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 font-semibold text-red-700">
      *
    </span>
  )
}
export function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <span>
      {label}
      {required && <RequiredMark />}
    </span>
  )
}
