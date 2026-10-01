import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    ref.current?.showModal()
    const dialog = ref.current
    const previousFocus = opener.current
    return () => {
      dialog?.close()
      queueMicrotask(() => {
        if (previousFocus?.isConnected) previousFocus.focus()
      })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="editor-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return
        const nodes = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]',
          ),
        ].filter((n) => n.getClientRects().length)
        const first = nodes[0],
          last = nodes.at(-1)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(720px,calc(100vw-24px))] max-w-none overflow-y-auto rounded-2xl border border-line bg-white p-0 shadow-xl"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-4 sm:px-7">
        <h2 id="editor-title" className="text-lg font-semibold">
          {title}
        </h2>
        <Button
          variant="quiet"
          type="button"
          disabled={busy}
          aria-label="Cerrar formulario"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </dialog>
  )
}
