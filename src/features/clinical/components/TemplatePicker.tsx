import { useState } from 'react'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { Button } from '../../../shared/ui/Button'
import { useQueryData } from '../../../shared/data/useQueryData'
import type { ClinicalTemplate } from '../model/clinical'
export function TemplatePicker({
  kind,
  onApply,
}: {
  kind: string
  onApply: (content: string) => void
}) {
  const [selected, setSelected] = useState<PickedEntity[]>([])
  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <EntityPicker
        label="Plantilla"
        source={{
          endpoint: '/api/v1/clinical/templates',
          labelKey: 'name',
          filters: { active: 'true', kind },
        }}
        selected={selected}
        onChange={setSelected}
      />
      {selected[0] && <TemplatePreview id={selected[0].id} onApply={onApply} />}
    </div>
  )
}
function TemplatePreview({ id, onApply }: { id: string; onApply: (content: string) => void }) {
  const template = useQueryData<ClinicalTemplate>('/api/v1/clinical/templates/' + id)
  if (template.loading)
    return (
      <p role="status" className="text-xs text-muted">
        Consultando plantilla…
      </p>
    )
  if (template.error)
    return (
      <p role="alert" className="error-box">
        {template.error}
      </p>
    )
  return template.data ? (
    <>
      <p className="max-h-48 overflow-auto text-sm whitespace-pre-wrap">{template.data.content}</p>
      <Button type="button" variant="secondary" onClick={() => onApply(template.data!.content)}>
        Añadir texto de plantilla
      </Button>
    </>
  ) : null
}
