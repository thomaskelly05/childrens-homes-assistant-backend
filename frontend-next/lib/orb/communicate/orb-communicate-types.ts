/** ORB Communicate — shared types for accessible communication workflows. */

export type CommunicateMode =
  | 'hub'
  | 'easy_read'
  | 'visual_board'
  | 'social_story'
  | 'my_voice_profile'
  | 'reflect_record'

export type CommunicateAgeGroup = 'child' | 'young_person' | 'adult'

export type EasyReadContext =
  | 'contact'
  | 'health'
  | 'safety'
  | 'routine'
  | 'transition'
  | 'house_meeting'
  | 'complaint'
  | 'safeguarding'
  | 'behaviour_support'
  | 'other'

export type EasyReadOutputLength = 'short' | 'standard' | 'detailed'

export type EasyReadRequest = {
  personNameOrInitials?: string
  ageGroup: CommunicateAgeGroup
  whatNeedsExplaining: string
  context: EasyReadContext
  communicationNeeds?: string
  sensoryConsiderations?: string
  emotionalContext?: string
  outputLength: EasyReadOutputLength
}

export type EasyReadOutput = {
  title: string
  whatIsHappening: string
  whyItIsHappening: string
  whatHappensNext: string
  whoCanHelp: string
  howICanSayHowIFeel: string
  suggestedVisualSymbols: string[]
  staffGuidance: string
  recordingPrompts: string[]
}

export type VisualBoardCardCount = 4 | 6 | 8 | 12

export type VisualBoardRequest = {
  boardPurpose: string
  numberOfCards: VisualBoardCardCount
  includeFeelings: boolean
  includeYesNoHelpStop: boolean
  includePeoplePlacesTime: boolean
  safeguardingSensitive: boolean
}

export type VisualSymbolCategory =
  | 'feeling'
  | 'action'
  | 'response'
  | 'person'
  | 'place'
  | 'time'
  | 'health'
  | 'support'
  | 'other'

export type VisualSymbol = {
  id: string
  label: string
  plainLanguage: string
  category: VisualSymbolCategory
  altText: string
  safeguardingSensitive: boolean
  ageSuitability: CommunicateAgeGroup | 'all'
  staffNote?: string
}

export type VisualBoardOutput = {
  title: string
  purpose: string
  cards: VisualSymbol[]
  staffNotes: string
}

export type SocialStoryTone = 'calm' | 'reassuring' | 'preparation' | 'repair'

export type SocialStoryRequest = {
  situation: string
  whatMayFeelHard?: string
  whatHelpsFeelSafe?: string
  choicesPersonCanMake?: string
  whoCanHelp?: string
  tone: SocialStoryTone
}

export type SocialStoryOutput = {
  title: string
  story: string
  suggestedSymbols: string[]
  staffDeliveryGuidance: string
  regulationSupportOptions: string[]
  followUpReflectionPrompts: string[]
}

export type PreferredCommunicationFormat =
  | 'symbols'
  | 'photos'
  | 'objects'
  | 'audio'
  | 'short_text'
  | 'other'

export type MyVoiceProfile = {
  howICommunicate: string
  howISayYes: string
  howISayNo: string
  howIShowPain: string
  howIShowAnxiety: string
  wordsSignsOrSymbolsIUse: string
  whatIUnderstandWell: string
  whatIFindHardToUnderstand: string
  whatHelpsMeProcessInformation: string
  whatMakesCommunicationHarder: string
  sensoryNeeds: string
  trustedAdults: string
  thingsStaffShouldNotAssume: string
  preferredCommunicationFormat: PreferredCommunicationFormat
  preferredCommunicationFormatOther?: string
  recordingGuidance: string
  updatedAt?: string
}

export type CommunicationReflectionRequest = {
  whatWasExplained: string
  communicationSupportUsed?: string
  howDidPersonRespond?: string
  exactWordsSignsOrGestures?: string
  choicesOffered?: string
  whatHelped?: string
  whatDidNotHelp?: string
  safeguardingHealthOrRiskConcern?: string
  whatShouldStaffDoNext?: string
}

export type CommunicationReflectionOutput = {
  title: string
  record: string
  observationHighlights: string[]
  staffSupportSummary: string
  nextSteps: string
  recordingReminders: string[]
}
