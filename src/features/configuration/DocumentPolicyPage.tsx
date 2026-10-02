import { useState } from 'react'
import { useQueryData } from '../../shared/data/useQueryData'
import { useSaveForm } from '../../shared/data/useSaveForm'
import { saveJson } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
import { FormField } from '../../shared/ui/FormField'
import { useAuth } from '../auth/hooks/useAuth'
import { fileSize, type DocumentPolicy } from '../documents/model/documents'
export function DocumentPolicyPage() {
  const data = useQueryData<DocumentPolicy>('/api/v1/documents/policy'),
    auth = useAuth()
  if (data.loading) return <p role="status">Consultando almacenamiento…</p>
  if (data.error)
    return (
      <p role="alert" className="error-box">
        {data.error}
      </p>
    )
  return data.data ? (
    <PolicyEditor
      key={data.data.version}
      policy={data.data}
      writable={auth.can('CLINICAL_CONFIG_WRITE')}
      onSaved={data.reload}
    />
  ) : null
}
function PolicyEditor({
  policy,
  writable,
  onSaved,
}: {
  policy: DocumentPolicy
  writable: boolean
  onSaved: () => void
}) {
  const [limit, setLimit] = useState(policy.maxFileMiB),
    form = useSaveForm()
  return (
    <section className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-semibold">Almacenamiento de documentos</h2>
      <p className="text-sm leading-6 text-muted">
        {policy.fileCount} archivos originales · {fileSize(policy.storedBytes)} almacenados en
        PostgreSQL. Las listas consultan sus metadatos; el contenido se recupera al abrir un
        documento.
      </p>
      <form
        className="max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              saveJson(
                '/api/v1/documents/policy',
                { maxFileMiB: limit, version: policy.version },
                'PUT',
              ),
            onSaved,
          )
        }}
      >
        <FormField
          label="Tamaño máximo por archivo (MiB)"
          type="number"
          required
          min={1}
          max={60}
          disabled={!writable}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        />
        <p className="text-xs text-muted">
          Límite inicial: 20 MiB. Cambiar el límite no altera documentos ya guardados.
        </p>
        {writable && <Button disabled={form.busy}>Guardar límite</Button>}
      </form>
    </section>
  )
}
