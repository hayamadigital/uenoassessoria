import { createElement } from 'react'
import { Image as ExpoImage, type ImageProps } from 'expo-image'

export function AppImage({
  contentFit = 'cover',
  cachePolicy = 'memory-disk',
  transition = 150,
  ...props
}: ImageProps) {
  return createElement(ExpoImage as any, {
    ...props,
    contentFit,
    cachePolicy,
    transition,
  }) as any
}
