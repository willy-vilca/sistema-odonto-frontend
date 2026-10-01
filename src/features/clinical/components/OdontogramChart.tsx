import { findingLabels, type ToothMark } from '../model/clinical'
const colors: Record<string, string> = {
  UNRECORDED: '#f2f4f2',
  HEALTHY: '#c5e1d3',
  CARIES: '#f2b4b4',
  RESTORATION: '#b4d2ec',
  MISSING: '#cbd0ce',
  EXTRACTION: '#efceb2',
  CROWN: '#ddd0ee',
  ROOT_CANAL: '#ddd0ee',
  OTHER: '#e8d99c',
}
const codes: Record<string, string> = {
  UNRECORDED: '—',
  HEALTHY: 'S',
  CARIES: 'C',
  RESTORATION: 'R',
  MISSING: 'A',
  EXTRACTION: 'E',
  CROWN: 'Co',
  ROOT_CANAL: 'TC',
  OTHER: 'O',
}
export function OdontogramChart({
  marks,
  temporary,
  selected,
  onSelect,
}: {
  marks: ToothMark[]
  temporary: boolean
  selected: number
  onSelect: (tooth: number) => void
}) {
  const quadrants = temporary ? [5, 6, 8, 7] : [1, 2, 4, 3],
    positions = temporary ? 5 : 8
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted">
        Vista desde el profesional. Derecha e izquierda corresponden al paciente. Selecciona una
        pieza para consultar o registrar sus superficies.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {quadrants.map((quadrant, index) => {
          const teeth = Array.from(
            { length: positions },
            (_, i) => quadrant * 10 + (index === 0 || index === 2 ? positions - i : i + 1),
          )
          return (
            <section key={quadrant} className="min-w-0 rounded-xl border border-line bg-white p-3">
              <h3 className="mb-3 text-xs font-semibold text-muted">
                {index < 2 ? 'Superior' : 'Inferior'} · {index % 2 === 0 ? 'Derecha' : 'Izquierda'}{' '}
                del paciente
              </h3>
              <div className="grid grid-cols-4 gap-2 min-[1400px]:grid-cols-8">
                {teeth.map((tooth) => {
                  const toothMarks = marks.filter((mark) => mark.tooth === tooth),
                    whole = toothMarks.find((mark) => mark.surface === 'TOOTH'),
                    summary = toothMarks
                      .filter((mark) => mark.finding !== 'UNRECORDED')
                      .map((mark) => findingLabels[mark.finding])
                      .join(', ')
                  return (
                    <button
                      key={tooth}
                      type="button"
                      aria-label={'Pieza ' + tooth + ': ' + (summary || 'sin registrar')}
                      aria-pressed={selected === tooth}
                      onClick={() => onSelect(tooth)}
                      className={
                        'flex min-h-24 min-w-11 flex-col items-center rounded-lg border p-1.5 ' +
                        (selected === tooth
                          ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                          : 'border-line bg-canvas hover:bg-brand-50')
                      }
                    >
                      <span className="text-xs font-semibold">{tooth}</span>
                      <svg className="mt-1 h-12 w-12" viewBox="0 0 60 60" aria-hidden="true">
                        <rect
                          x="3"
                          y="3"
                          width="54"
                          height="54"
                          rx="10"
                          fill={colors[whole?.finding ?? 'UNRECORDED']}
                          stroke="#52665b"
                        />
                        {[
                          ['V', 'M30 5 L49 19 L11 19 Z'],
                          ['D', 'M55 30 L41 49 L41 11 Z'],
                          ['L', 'M30 55 L11 41 L49 41 Z'],
                          ['M', 'M5 30 L19 11 L19 49 Z'],
                          ['O', 'M20 20 L40 20 L40 40 L20 40 Z'],
                        ].map(([surface, shape]) => (
                          <path
                            key={surface}
                            d={shape}
                            fill={
                              colors[
                                toothMarks.find((mark) => mark.surface === surface)?.finding ??
                                  'UNRECORDED'
                              ]
                            }
                            stroke="#52665b"
                            strokeWidth=".8"
                          />
                        ))}
                        {whole && whole.finding !== 'UNRECORDED' && (
                          <text
                            x="30"
                            y="35"
                            textAnchor="middle"
                            fill="#263b35"
                            fontSize="14"
                            fontWeight="bold"
                          >
                            {codes[whole.finding]}
                          </text>
                        )}
                      </svg>
                      <span className="mt-1 min-h-4 text-[10px] font-medium">
                        {toothMarks.some((mark) => mark.finding !== 'UNRECORDED')
                          ? 'Registrada'
                          : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-line bg-white p-3 text-xs">
        {Object.entries(findingLabels).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded border border-line text-[10px] font-bold text-ink"
              style={{ background: colors[key] }}
            >
              {codes[key]}
            </span>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
