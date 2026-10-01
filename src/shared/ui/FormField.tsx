import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
export function FormField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field-label">
      {label}
      <input className="field" {...props} />
    </label>
  )
}
export function TextAreaField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="field-label">
      {label}
      <textarea className="field min-h-24" {...props} />
    </label>
  )
}
