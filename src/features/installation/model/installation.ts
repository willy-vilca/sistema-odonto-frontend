export interface Installation {
  displayName: string
  timeZone: string
  brandColor: string
  accentColor: string
  hasLogo: boolean
  logoRevision: number
  dateFormat: string
  currency: string
}
export type InstallationState =
  | { status: 'loading' }
  | { status: 'ready'; data: Installation }
  | { status: 'error'; requestId?: string }
