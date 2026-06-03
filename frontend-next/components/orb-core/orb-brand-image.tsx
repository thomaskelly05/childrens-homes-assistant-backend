'use client'

import type { CSSProperties, ImgHTMLAttributes } from 'react'

import { ORB_BRAND_IMAGE_SRC } from '@/lib/orb/orb-brand-asset'

export type OrbBrandImageCrop = 'full' | 'sphere'

const CROP_OBJECT_POSITION: Record<OrbBrandImageCrop, string> = {
  full: 'center center',
  sphere: 'center 72%'
}

export type OrbBrandImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** `full` shows lockup; `sphere` favours the orb for small avatars. */
  crop?: OrbBrandImageCrop
}

/**
 * Static ORB brand asset — sized only with width/height/object-fit (no CSS filters or gradients).
 */
export function OrbBrandImage({
  alt = 'ORB',
  className = '',
  crop = 'full',
  width,
  height,
  style,
  ...rest
}: OrbBrandImageProps) {
  const imgStyle: CSSProperties = {
    objectFit: 'contain',
    objectPosition: CROP_OBJECT_POSITION[crop],
    width: width ?? '100%',
    height: height ?? '100%',
    ...style
  }

  return (
    <img
      src={ORB_BRAND_IMAGE_SRC}
      alt={alt}
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      className={`orb-brand-image block max-h-full max-w-full select-none ${className}`.trim()}
      data-orb-brand-image
      style={imgStyle}
      draggable={false}
      decoding="async"
      {...rest}
    />
  )
}
