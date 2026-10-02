import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { formatLocalDate, dateLocale } from '../../../shared/data/dateFormat'
import { errorMessage } from '../../../shared/api/http'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import type { PickedEntity } from '../../../shared/ui/EntityPicker'
import { getEncounter, finalizeEncounter } from '../services/clinicalService'
import type { Encounter, EncounterRevision } from '../model/clinical'
import { EncounterEditor } from './EncounterEditor'
export function EncountersPanel({
  initialEncounterId,
  patientId,
  dentist,
  dateFormat,
  timeZone,
}: {
  initialEncounterId?: string
  patientId: string
  dentist?: PickedEntity
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    [status, setStatus] = useState(''),
    list = usePagedList<Encounter>(
      '/api/v1/clinical/encounters',
      { patientId, status, direction: 'desc' },
      'attendedOn',
    )
  const [selected, setSelected] = useState<Encounter>(),
    [editor, setEditor] = useState<'new' | 'edit' | 'correction'>(),
    setError = useErrorNotification(),
    form = useSaveForm()
  useEffect(() => {
    if (!initialEncounterId) return
    let active = true
    void getEncounter(initialEncounterId)
      .then((record) => {
        if (active && record.patientId === patientId) setSelected(record)
      })
      .catch((e) => {
        if (active) setError(errorMessage(e))
      })
    return () => {
      active = false
    }
  }, [initialEncounterId, patientId, setError])
  function saved() {
    setEditor(undefined)
    setSelected(undefined)
    list.reload()
  }
  async function open(row: Encounter) {
    setError('')
    try {
      setSelected(await getEncounter(row.id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Atenciones</h2>
          <p className="mt-2 text-sm text-muted">
            Guarda un borrador y finaliza cuando el registro esté completo.
          </p>
        </div>
        {auth.can('CLINICAL_WRITE') && (
          <Button
            disabled={!dentist}
            onClick={() => {
              setSelected(undefined)
              setEditor('new')
            }}
          >
            Nueva atención
          </Button>
        )}
      </header>
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        filters={
          <label className="field-label">
            Estado
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="DRAFT">Borradores</option>
              <option value="FINAL">Finalizadas</option>
            </select>
          </label>
        }
        columns={[
          { label: 'Fecha', render: (row) => formatLocalDate(row.attendedOn, dateFormat) },
          { label: 'Motivo', render: (row) => row.reason },
          { label: 'Odontólogo', render: (row) => row.dentistName },
          {
            label: 'Estado',
            render: (row) => (
              <span className={row.status === 'FINAL' ? 'status-active' : 'status-inactive'}>
                {row.status === 'FINAL' ? 'Finalizada · v' + row.revision : 'Borrador'}
              </span>
            ),
          },
        ]}
        actions={(row) => (
          <Button variant="quiet" onClick={() => void open(row)}>
            Ver atención
          </Button>
        )}
      />
      {editor && (
        <EncounterEditor
          mode={editor}
          encounter={selected}
          patientId={patientId}
          dentist={dentist}
          timeZone={timeZone}
          onClose={() => setEditor(undefined)}
          onSaved={saved}
        />
      )}
      {selected && !editor && (
        <Modal title="Detalle de atención" busy={form.busy} onClose={() => setSelected(undefined)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="text-xs text-brand-700">
                {formatLocalDate(selected.attendedOn, dateFormat)} ·{' '}
                {selected.status === 'FINAL'
                  ? 'Finalizada · Versión ' + selected.revision
                  : 'Borrador'}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{selected.reason}</h3>
            </div>
            <ClinicalContent content={selected.content} />
            {auth.can('CLINICAL_WRITE') && (
              <div className="flex flex-wrap gap-3">
                {selected.status === 'DRAFT' ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditor('edit')}>
                      Editar borrador
                    </Button>
                    <Button
                      disabled={form.busy}
                      onClick={() => void form.submit(() => finalizeEncounter(selected), saved)}
                    >
                      Finalizar atención
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setEditor('correction')}>
                    Registrar corrección
                  </Button>
                )}
              </div>
            )}
            {selected.status === 'FINAL' && (
              <EncounterVersions id={selected.id} dateFormat={dateFormat} timeZone={timeZone} />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
export function ClinicalContent({ content }: { content: Encounter['content'] }) {
  return (
    <dl className="space-y-4">
      {[
        ['Anamnesis', content?.anamnesis],
        ['Evolución', content?.evolution],
        ['Diagnósticos', content?.diagnoses],
        ['Indicaciones', content?.indications],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm font-semibold">{label}</dt>
          <dd className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
            {value || 'Sin registrar'}
          </dd>
        </div>
      ))}
      <div>
        <dt className="text-sm font-semibold">Procedimientos realizados</dt>
        <dd className="mt-2 space-y-2">
          {content?.procedures.map((procedure, index) => (
            <p key={index} className="text-sm">
              {procedure.description} · {procedure.quantity} unidad(es)
              {procedure.tooth ? ' · Pieza ' + procedure.tooth : ''}
            </p>
          ))}
          {!content?.procedures.length && (
            <p className="text-sm text-muted">Sin procedimientos registrados.</p>
          )}
        </dd>
      </div>
    </dl>
  )
}
function EncounterVersions({
  id,
  dateFormat,
  timeZone,
}: {
  id: string
  dateFormat: string
  timeZone: string
}) {
  const list = usePagedList<EncounterRevision>(
      '/api/v1/clinical/encounters/' + id + '/versions',
      { direction: 'desc' },
      'number',
    ),
    [selected, setSelected] = useState<EncounterRevision>()
  return (
    <section className="space-y-4 border-t border-line pt-5">
      <h3 className="font-semibold">Versiones conservadas</h3>
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        columns={[
          { label: 'Versión', render: (row) => 'v' + row.number },
          {
            label: 'Fecha y responsable',
            render: (row) =>
              new Intl.DateTimeFormat(dateLocale(dateFormat), { timeZone }).format(
                new Date(row.createdAt),
              ) +
              ' · ' +
              row.actorName,
          },
          { label: 'Motivo de versión', render: (row) => row.correctionReason },
        ]}
        actions={(row) => (
          <Button variant="quiet" onClick={() => setSelected(row)}>
            Consultar versión {row.number}
          </Button>
        )}
      />
      {selected && (
        <article className="space-y-4 rounded-xl border border-line bg-canvas p-4">
          <h4 className="font-semibold">
            Versión {selected.number} · {selected.patientName}
          </h4>
          <p className="text-xs text-muted">
            {selected.patientCode} · {selected.dentistName} · {selected.actorName}
          </p>
          <ClinicalContent content={selected.content} />
        </article>
      )}
    </section>
  )
}
