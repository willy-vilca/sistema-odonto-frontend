export interface Installation {
  displayName: string
  timeZone: string
  currency: string
}
export type InstallationState =
  | { status: 'loading' }
  | { status: 'ready'; data: Installation }
  | { status: 'error'; requestId?: string }
