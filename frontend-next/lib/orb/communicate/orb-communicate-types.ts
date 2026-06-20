/** ORB Communicate — shared types for accessible communication workflows. */

export type CommunicateMode =
  | 'hub'
  | 'support_pack'
  | 'easy_read'
  | 'visual_board'
  | 'social_story'
  | 'my_voice_profile'
  | 'reflect_record'

export type CommunicationAudience = 'child' | 'young_person' | 'adult'

export type CommunicationSupportPackSensitivity =
  | 'routine'
  | 'emotional'
  | 'health'
  | 'safeguarding_sensitive'

export type CommunicationOutputPreference =
  | 'let_orb_choose'
  | 'easy_read_only'
  | 'visual_support'
  | 'social_story'
  | 'full_support_pack'

export type CommunicateRequestIntent =
  | 'contact_change'
  | 'new_staff_member'
  | 'hospital_appointment'
  | 'bedtime_worries'
  | 'feelings_expression'
  | 'safeguarding_disclosure'
  | 'visual_routine'
  | 'general'

export type CommunicationSupportPackSectionType =
  | 'easy_read'
  | 'visual_cards'
  | 'social_story'
  | 'staff_guidance'
  | 'regulation_support'
  | 'recording_prompts'
  | 'reflection_draft'
  | 'custom_note'

export type CommunicationSupportPackAction =
  | 'copy_section'
  | 'edit_section'
  | 'regenerate_section'
  | 'create_image'
  | 'replace_image'
  | 'save_to_library'
  | 'personalise_for_person'

export type CommunicationSupportPackSection = {
  id: string
  type: CommunicationSupportPackSectionType
  heading: string
  description: string
  content: string
  visualCards?: VisualSymbol[]
  actions: CommunicationSupportPackAction[]
}

export type CommunicationSupportPackRequest = {
  prompt: string
  useMyVoiceProfile?: boolean
  myVoiceProfile?: MyVoiceProfile | null
  audience?: CommunicationAudience
  sensitivity?: CommunicationSupportPackSensitivity
  outputPreference?: CommunicationOutputPreference
  includeVisuals?: boolean
  includeRecordingPrompts?: boolean
}

export type CommunicationPlan = {
  intent: CommunicateRequestIntent
  sensitivity: CommunicationSupportPackSensitivity
  audience: CommunicationAudience
  sectionTypes: CommunicationSupportPackSectionType[]
  safeguardingMode: boolean
}

export type CommunicationSupportPackOutput = {
  packTitle: string
  intent: CommunicateRequestIntent
  sensitivity: CommunicationSupportPackSensitivity
  audience: CommunicationAudience
  sections: CommunicationSupportPackSection[]
  suggestedActions: string[]
  safetyNotes: string[]
  myVoiceProfileUsed: boolean
  myVoiceProfileNotice?: string
  createdAt: string
}

export type CommunicateAgeGroup = CommunicationAudience

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
