/**
 * Lightweight composer upload actions for mobile/desktop plus menus.
 * Keep this module free of foundation registry / evidence imports so client
 * surfaces do not pull the full capability map at build time.
 */

export const ORB_COMPOSER_UPLOAD_PLUS_ACTIONS = [
  { id: 'take_photo' as const, label: 'Camera', capabilityId: 'camera_capture' as const },
  { id: 'photo_library' as const, label: 'Photos', capabilityId: 'photo_upload' as const },
  { id: 'choose_files' as const, label: 'Files', capabilityId: 'file_upload' as const }
] as const

export type OrbComposerUploadPlusActionId =
  (typeof ORB_COMPOSER_UPLOAD_PLUS_ACTIONS)[number]['id']
