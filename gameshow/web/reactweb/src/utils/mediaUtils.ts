/**
 * Utility functions for handling media assets
 */

// Environment variables
const CDN_URL = process.env.REACT_APP_CDN_URL || '';
const API_URL = process.env.REACT_APP_API_URL || '';
const PUBLIC_URL = process.env.PUBLIC_URL || '';

/**
 * Get the full URL for a static asset
 */
export const getStaticAssetUrl = (path: string): string => {
  return `${PUBLIC_URL}/static/${path}`;
};

/**
 * Get the full URL for a dynamic asset from CDN
 */
export const getDynamicAssetUrl = (path: string): string => {
  return `${CDN_URL}/${path}`;
};

/**
 * Get the full URL for a media API endpoint
 */
export const getMediaApiUrl = (endpoint: string): string => {
  return `${API_URL}/media/${endpoint}`;
};

/**
 * Check if WebP is supported by the browser
 */
export const isWebPSupported = async (): Promise<boolean> => {
  if (!window.createImageBitmap) return false;

  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());

  return createImageBitmap(blob).then(() => true, () => false);
};

/**
 * Get the appropriate image URL based on format support and size
 */
export const getOptimizedImageUrl = async (
  path: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): Promise<string> => {
  const webpSupported = await isWebPSupported();
  const format = webpSupported ? 'webp' : 'jpg';

  // Size mappings (can be adjusted based on needs)
  const sizes = {
    small: '300',
    medium: '800',
    large: '1200'
  };

  return `${CDN_URL}/images/${path}?format=${format}&w=${sizes[size]}`;
};

/**
 * Preload critical assets
 */
export const preloadCriticalAssets = (assets: string[]): void => {
  assets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = getStaticAssetUrl(asset);

    // Set appropriate as attribute based on file extension
    const ext = asset.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'woff2':
      case 'woff':
      case 'ttf':
        link.as = 'font';
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        link.as = 'image';
        break;
      default:
        link.as = 'fetch';
    }

    document.head.appendChild(link);
  });
};