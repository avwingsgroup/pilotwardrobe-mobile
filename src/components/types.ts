/** Shared prop types for presentational components. */
export interface TimelineStep {
  label: string
  detail?: string | null
  state: 'done' | 'current' | 'upcoming'
}

export interface EvidenceItem {
  key: string
  previewUrl: string
  mediaId: string | null
  progress: number
  error: string | null
}
