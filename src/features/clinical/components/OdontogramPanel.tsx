import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList, type PageData } from '../../../shared/data/usePagedList'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday, formatLocalDate } from '../../../shared/data/dateFormat'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import {
  findingLabels,
  surfaceLabels,
  type ClinicalState,
  type Odontogram,
} from '../model/clinical'
import { saveState } from '../services/clinicalService'
import { OdontogramChart } from './OdontogramChart'
export function OdontogramPanel({
  patientId,
  dentistId,
  dateFormat,
  timeZone,
}: {
  patientId: string
  dentistId?: string
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    list = usePagedList<ClinicalState>(
      '/api/v1/clinical/states/ODONTOGRAM',
      { patientId, direction: 'desc' },
      'createdAt',
    ),
    latest = useQueryData<PageData<ClinicalState>>(
      '/api/v1/clinical/states/ODONTOGRAM?patientId=' +
        patientId +
        '&sort=createdAt&direction=desc&size=1',
    )
  const [selectedState, setSelectedState] = useState<ClinicalState>(),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<Odontogram>({ marks: [], notes: '' }),
    [temporary, setTemporary] = useState(false),
    [tooth, setTooth] = useState(11),
    [date, setDate] = useState(clinicToday(timeZone)),
    [reason, setReason] = useState('')
  const form = useSaveForm(),
    state = selectedState ?? latest.data?.items[0],
    data = editing ? draft : (state?.odontogram ?? { marks: [], notes: '' })
  function mark(surface: string, finding: string, note: string) {
    setDraft({
      ...draft,
      marks: [
        ...draft.marks.filter((mark) => !(mark.tooth === tooth && mark.surface === surface)),
        { tooth, surface, finding, note },
      ],
    })
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Odontograma</h2>
          <p className="mt-2 text-sm text-muted">
            {editing
              ? 'Nuevo estado en preparación'
              : state
                ? 'Estado del ' +
                  formatLocalDate(state.recordedOn, dateFormat) +
                  ' · ' +
                  state.actorName
                : 'Las superficies aún no se han registrado.'}
          </p>
        </div>
        {auth.can('CLINICAL_WRITE') && !editing && (
          <Button
            disabled={!dentistId || latest.loading || !!latest.error}
            onClick={() => {
              setDraft(latest.data?.items[0]?.odontogram ?? { marks: [], notes: '' })
              setDate(clinicToday(timeZone))
              setReason('')
              setEditing(true)
            }}
          >
            Actualizar odontograma
          </Button>
        )}
      </header>
      {latest.error && (
        <p role="alert" className="error-box">
          {latest.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Dentición">
        {[
          ['false', 'Permanente · 32 piezas'],
          ['true', 'Temporal · 20 piezas'],
        ].map(([value, label]) => (
          <Button
            key={value}
            animate={false}
            variant={temporary === (value === 'true') ? 'primary' : 'secondary'}
            aria-pressed={temporary === (value === 'true')}
            onClick={() => {
              setTemporary(value === 'true')
              setTooth(value === 'true' ? 51 : 11)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <OdontogramChart
        marks={data.marks}
        temporary={temporary}
        selected={tooth}
        onSelect={setTooth}
      />
      <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <h3 className="text-lg font-semibold">Pieza {tooth}</h3>
        <p className="text-xs text-muted">
          Oclusal en posteriores e incisal en anteriores. Los hallazgos de pieza completa se
          registran por separado.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(surfaceLabels).map(([surface, label]) => {
            const current = data.marks.find(
              (mark) => mark.tooth === tooth && mark.surface === surface,
            )
            return (
              <div key={surface} className="space-y-2 rounded-xl border border-line bg-canvas p-3">
                {editing ? (
                  <>
                    <label className="field-label">
                      {label}
                      <select
                        className="field"
                        value={current?.finding ?? 'UNRECORDED'}
                        onChange={(e) => mark(surface, e.target.value, current?.note ?? '')}
                      >
                        {Object.entries(findingLabels)
                          .filter(
                            ([key]) =>
                              surface === 'TOOTH' ||
                              !['MISSING', 'EXTRACTION', 'CROWN', 'ROOT_CANAL'].includes(key),
                          )
                          .map(([key, title]) => (
                            <option key={key} value={key}>
                              {title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <FormField
                      label={'Nota de ' + label.toLowerCase()}
                      maxLength={500}
                      value={current?.note ?? ''}
                      onChange={(e) =>
                        mark(surface, current?.finding ?? 'UNRECORDED', e.target.value)
                      }
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted">{label}</p>
                    <p className="text-sm font-semibold">
                      {findingLabels[current?.finding ?? 'UNRECORDED']}
                    </p>
                    {current?.note && <p className="text-xs break-words">{current.note}</p>}
                  </>
                )}
              </div>
            )
          })}
        </div>
        {!editing && (
          <p className="text-sm whitespace-pre-wrap">
            {data.notes || 'Sin observaciones generales.'}
          </p>
        )}
      </section>
      {editing && (
        <form
          className="space-y-4 rounded-2xl border border-line bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault()
            void form.submit(
              () =>
                saveState(
                  'ODONTOGRAM',
                  patientId,
                  dentistId!,
                  date,
                  latest.data?.items[0]?.id ?? null,
                  reason,
                  null,
                  draft,
                ),
              () => {
                setEditing(false)
                setSelectedState(undefined)
                latest.reload()
                list.reload()
              },
            )
          }}
        >
          <FormField
            label="Fecha del odontograma"
            type="date"
            required
            max={clinicToday(timeZone)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextAreaField
            label="Observaciones generales"
            maxLength={4000}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <TextAreaField
            label="Motivo del nuevo estado"
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={form.busy}>Guardar odontograma</Button>
            <Button
              type="button"
              variant="secondary"
              disabled={form.busy}
              onClick={() => setEditing(false)}
            >
              Cancelar edición
            </Button>
          </div>
        </form>
      )}
      <h3 className="font-semibold">Historial del odontograma</h3>
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        columns={[
          { label: 'Fecha', render: (row) => formatLocalDate(row.recordedOn, dateFormat) },
          { label: 'Motivo', render: (row) => row.reason },
          {
            label: 'Responsable',
            render: (row) => [row.dentistName, row.actorName].filter(Boolean).join(' · '),
          },
        ]}
        actions={(row) => (
          <Button variant="quiet" disabled={editing} onClick={() => setSelectedState(row)}>
            Ver estado
          </Button>
        )}
      />
    </div>
  )
}
