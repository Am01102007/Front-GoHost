export function isCloudinaryUrl(url?: string): boolean {
  if (!url) return false;
  try {
    return /res\.cloudinary\.com\/.+\/image\/upload\//.test(url);
  } catch {
    return false;
  }
}

/**
 * Inserta transformaciones de Cloudinary justo después de "/image/upload/".
 * Mantiene la URL original si no es de Cloudinary.
 */
export function withTransforms(url: string, transforms: string): string {
  if (!isCloudinaryUrl(url)) return url;
  return url.replace(/(\/image\/upload\/)(?:[^/]+\/)?/, `$1${transforms}/`);
}

/**
 * Construye un srcset responsivo usando anchos definidos.
 */
export function buildSrcSet(url: string, widths: number[] = [320, 480, 640, 768, 1024, 1280]): string {
  if (!isCloudinaryUrl(url)) return '';
  const entries = widths.map(w => `${withTransforms(url, `c_fill,f_auto,q_auto,w_${w},dpr_auto`)} ${w}w`);
  return entries.join(', ');
}

export function defaultSizes(): string {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
}

export function mainImageSizes(): string {
  return '(max-width: 1024px) 100vw, 1024px';
}

export function thumbSizes(): string {
  return '(max-width: 640px) 50vw, 200px';
}
