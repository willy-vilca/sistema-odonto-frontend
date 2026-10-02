export type NotificationTone = 'success' | 'error'
export interface Notification {
  id: number
  message: string
  tone: NotificationTone
  expiresAt: number
}
let sequence = 0
const listeners = new Set<() => void>()
const dialogs: HTMLDialogElement[] = []
let snapshot: { items: Notification[]; target: HTMLDialogElement | null } = {
  items: [],
  target: null,
}
function publish() {
  listeners.forEach((listener) => listener())
}
export function notify(message: string, tone: NotificationTone = 'success') {
  if (!message.trim()) return
  snapshot = {
    ...snapshot,
    items: [
      ...snapshot.items.filter(
        (item) =>
          (tone !== 'success' || item.tone !== 'error') &&
          (item.message !== message || item.tone !== tone),
      ),
      { id: ++sequence, message, tone, expiresAt: Date.now() + (tone === 'error' ? 8000 : 5000) },
    ].slice(-4),
  }
  publish()
}
export function dismissNotification(id: number) {
  snapshot = { ...snapshot, items: snapshot.items.filter((item) => item.id !== id) }
  publish()
}
export function registerNotificationDialog(dialog: HTMLDialogElement) {
  dialogs.push(dialog)
  snapshot = { ...snapshot, target: dialog }
  publish()
  return () => {
    const index = dialogs.indexOf(dialog)
    if (index !== -1) dialogs.splice(index, 1)
    snapshot = { ...snapshot, target: dialogs.at(-1) ?? null }
    publish()
  }
}
export const notificationStore = {
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
