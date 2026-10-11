import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { FieldLabel } from './FieldLabel'
export function FormField({
  label,
  requiredIndicator,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; requiredIndicator?: boolean }) {
  return (
    <label className="field-label">
      <FieldLabel label={label} required={requiredIndicator ?? props.required} />
      <input className="field" aria-label={label} {...props} />
    </label>
  )
}
export function TextAreaField({
  label,
  requiredIndicator,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; requiredIndicator?: boolean }) {
  return (
    <label className="field-label">
      <FieldLabel label={label} required={requiredIndicator ?? props.required} />
      <textarea className="field min-h-24" aria-label={label} {...props} />
    </label>
  )
}
