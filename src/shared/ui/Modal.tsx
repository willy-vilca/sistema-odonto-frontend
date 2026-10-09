import { useEffect, useRef, useId, type ReactNode } from 'react'
import { registerNotificationDialog } from '../notifications/notifications'
import { X } from 'lucide-react'
import { Button } from './Button'
let openDialogs = 0
let bodyOverflow = ''
export function Modal({
  title,
  children,
  onClose,
  busy = false,
  variant = 'default',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  variant?: 'default' | 'chat'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const opener = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    if (openDialogs++ === 0) {
      bodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    ref.current?.showModal()
    const dialog = ref.current
    const unregister = dialog ? registerNotificationDialog(dialog) : undefined
    const previousFocus = opener.current
    return () => {
      if (--openDialogs === 0) document.body.style.overflow = bodyOverflow
      unregister?.()
      dialog?.close()
      queueMicrotask(() => {
        const parentDialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(
          -1,
        )
        if (previousFocus?.isConnected && (!parentDialog || parentDialog.contains(previousFocus))) {
          previousFocus.focus()
        } else if (parentDialog) {
          // A refreshed list can replace the button that opened the upper dialog.
          parentDialog
            .querySelector<HTMLElement>(
              'button:not([disabled]),input:not([disabled]),select:not([disabled])',
            )
            ?.focus()
        }
      })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      data-modal-variant={variant}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!busy) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return
        e.stopPropagation()
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
      className={
        variant === 'chat'
          ? 'fixed inset-0 m-auto h-[100dvh] max-h-none w-full max-w-none overflow-hidden border border-line bg-white p-0 shadow-xl open:flex open:flex-col sm:h-[min(850px,calc(100dvh-32px))] sm:w-[min(1040px,calc(100vw-32px))] sm:rounded-2xl'
          : 'fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(720px,calc(100vw-24px))] max-w-none overflow-y-auto rounded-2xl border border-line bg-white p-0 shadow-xl'
      }
    >
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-5 py-4 sm:px-7">
        <h2 id={titleId} className="text-lg font-semibold">
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
      <div className={variant === 'chat' ? 'min-h-0 flex-1' : 'p-5 sm:p-7'}>{children}</div>
    </dialog>
  )
}
