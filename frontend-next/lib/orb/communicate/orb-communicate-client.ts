/**
 * ORB Communicate API client — structured for future backend endpoints.
 * Falls back to safe local generators when endpoints are unavailable.
 */

import { authFetch } from '@/lib/auth/api'

import {
  generateEasyReadLocal,
  generateReflectionRecordLocal,
  generateSocialStoryLocal,
  generateVisualBoardLocal
} from './orb-communicate-generators.ts'
import type {
  CommunicationReflectionOutput,
  CommunicationReflectionRequest,
  EasyReadOutput,
  EasyReadRequest,
  MyVoiceProfile,
  SocialStoryOutput,
  SocialStoryRequest,
  VisualBoardOutput,
  VisualBoardRequest
} from './orb-communicate-types.ts'

export const ORB_COMMUNICATE_API_PATHS = {
  easyRead: '/api/orb/communicate/easy-read',
  visualBoard: '/api/orb/communicate/visual-board',
  socialStory: '/api/orb/communicate/social-story',
  reflectRecord: '/api/orb/communicate/reflect-record',
  myVoiceProfile: '/api/orb/communicate/my-voice-profile'
} as const

type ApiEnvelope<T> = { success: boolean; data: T }

function parseEnvelope<T>(body: unknown): T | null {
  if (!body || typeof body !== 'object') return null
  const envelope = body as ApiEnvelope<T>
  if (!envelope.success || !envelope.data) return null
  return envelope.data
}

async function tryApiPost<T>(path: string, payload: unknown): Promise<T | null> {
  try {
    const json = await authFetch<unknown>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return parseEnvelope<T>(json)
  } catch {
    return null
  }
}

async function tryApiGet<T>(path: string): Promise<T | null> {
  try {
    const json = await authFetch<unknown>(path)
    return parseEnvelope<T>(json)
  } catch {
    return null
  }
}

export async function generateEasyRead(request: EasyReadRequest): Promise<EasyReadOutput> {
  const remote = await tryApiPost<EasyReadOutput>(ORB_COMMUNICATE_API_PATHS.easyRead, request)
  return remote ?? generateEasyReadLocal(request)
}

export async function generateVisualBoard(request: VisualBoardRequest): Promise<VisualBoardOutput> {
  const remote = await tryApiPost<VisualBoardOutput>(ORB_COMMUNICATE_API_PATHS.visualBoard, request)
  return remote ?? generateVisualBoardLocal(request)
}

export async function generateSocialStory(request: SocialStoryRequest): Promise<SocialStoryOutput> {
  const remote = await tryApiPost<SocialStoryOutput>(ORB_COMMUNICATE_API_PATHS.socialStory, request)
  return remote ?? generateSocialStoryLocal(request)
}

export async function generateReflectionRecord(
  request: CommunicationReflectionRequest
): Promise<CommunicationReflectionOutput> {
  const remote = await tryApiPost<CommunicationReflectionOutput>(
    ORB_COMMUNICATE_API_PATHS.reflectRecord,
    request
  )
  return remote ?? generateReflectionRecordLocal(request)
}

const MY_VOICE_PROFILE_STORAGE_KEY = 'orb-communicate-my-voice-profile-v1'

export function loadMyVoiceProfileLocal(): MyVoiceProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(MY_VOICE_PROFILE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MyVoiceProfile
  } catch {
    return null
  }
}

export function saveMyVoiceProfileLocal(profile: MyVoiceProfile): boolean {
  if (typeof window === 'undefined') return false
  const payload: MyVoiceProfile = {
    ...profile,
    updatedAt: new Date().toISOString()
  }
  try {
    window.localStorage.setItem(MY_VOICE_PROFILE_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export async function fetchMyVoiceProfile(): Promise<MyVoiceProfile | null> {
  const remote = await tryApiGet<MyVoiceProfile>(ORB_COMMUNICATE_API_PATHS.myVoiceProfile)
  if (remote) return remote
  return loadMyVoiceProfileLocal()
}

export type MyVoiceProfileSaveResult = {
  profile: MyVoiceProfile
  /** True when persisted to this device; false when only held in session memory. */
  savedLocally: boolean
}

export async function saveMyVoiceProfile(profile: MyVoiceProfile): Promise<MyVoiceProfileSaveResult> {
  const payload: MyVoiceProfile = {
    ...profile,
    updatedAt: new Date().toISOString()
  }
  try {
    const json = await authFetch<unknown>(ORB_COMMUNICATE_API_PATHS.myVoiceProfile, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const saved = parseEnvelope<MyVoiceProfile>(json)
    if (saved) return { profile: saved, savedLocally: true }
  } catch {
    // fall through to local persistence
  }
  return { profile: payload, savedLocally: saveMyVoiceProfileLocal(payload) }
}
