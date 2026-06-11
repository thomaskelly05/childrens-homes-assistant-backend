export type OrbPilotFeatureUsed =
  | 'chat'
  | 'dictate'
  | 'write'
  | 'voice'
  | 'export'
  | 'report'
  | 'other'

export type OrbPilotFeedback = {
  id: string
  pilotId?: string
  userId?: number
  role?: string
  featureUsed: OrbPilotFeatureUsed
  taskType?: string
  timeSavedMinutes?: number
  recordQualityRating?: number
  childVoiceRating?: number
  therapeuticLanguageRating?: number
  staffConfidenceRating?: number
  managerOversightRating?: number
  safeguardingPromptRating?: number
  wouldUseAgain?: boolean
  whatHelpedTheChild?: string
  whatWorkedWell?: string
  whatFeltUnsafeOrUnhelpful?: string
  improvementSuggestion?: string
  bugOrFriction?: string
  createdAt: string
}

export type OrbPilotSummary = {
  feedbackCount: number
  averageTimeSavedMinutes?: number
  averageRecordQualityRating?: number
  averageChildVoiceRating?: number
  averageTherapeuticLanguageRating?: number
  averageStaffConfidenceRating?: number
  wouldUseAgainPercent?: number
  themes: string[]
  limitations: string[]
}

export type OrbPilotFeedbackCreatePayload = {
  pilotId?: string
  featureUsed: OrbPilotFeatureUsed
  taskType?: string
  timeSavedMinutes?: number
  recordQualityRating?: number
  childVoiceRating?: number
  therapeuticLanguageRating?: number
  staffConfidenceRating?: number
  managerOversightRating?: number
  safeguardingPromptRating?: number
  wouldUseAgain?: boolean
  whatHelpedTheChild?: string
  whatWorkedWell?: string
  whatFeltUnsafeOrUnhelpful?: string
  improvementSuggestion?: string
  bugOrFriction?: string
}
