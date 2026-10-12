'use client';
/**
 * 업로드 이미지 정리 (v2.0 사용자 요청 — 「jpg로 바꾸고 메타데이터 전부 없애기」).
 *
 * 그림 파일에는 눈에 안 보이는 정보가 따라붙는다.
 *   · 파일 메타데이터 — 촬영 기기·위치(EXIF), 만든 프로그램, AI 그림 도구의 프롬프트·시드(PNG 텍스트)
 *   · 픽셀에 숨긴 정보 — NovelAI 등은 투명도 값의 끝자리(최하위 비트)에 프롬프트를 새겨 둔다(stealth)
 * 업로드 순간 브라우저에서 그림을 새로 그려 다시 저장하면 둘 다 사라진다.
 *   · 불투명한 그림 → JPG 92% (투명도 채널 자체가 없어져 숨긴 정보도 함께 사라진다)
 *   · 진짜 투명 배경이 있는 그림 → PNG 유지, 대신 모든 색·투명도 값의 끝자리를 지운다(눈에 안 보이는 차이)
 *   · 긴 변이 2000px을 넘으면 2000px로 줄인다
 * 움직이는 GIF·SVG는 다시 그리면 망가지므로 건드리지 않는다.
 */

export const CLEAN_MAX_SIDE = 2000;
export const CLEAN_JPEG_QUALITY = 0.92;
/** 정리를 거친 파일 이름 표시 — 저장소 경로가 `….c.jpg`면 이미 정리된 것 (기존 이미지 일괄 정리에서 건너뛴다) */
export const CLEAN_MARK = 'c';

/** 다시 그려도 되는 이미지 형식인가 */
export const isCleanable = (type: string) => /^image\/(png|jpe?g|webp|bmp|avif)$/i.test(type || '');

/** 그림을 새로 그려 메타데이터·숨긴 정보를 지운 Blob. 그림이 아니거나 못 읽으면 null */
export async function cleanImage(blob: Blob): Promise<Blob | null> {
  if (!isCleanable(blob.type) || typeof document === 'undefined') return null;
  let bmp: ImageBitmap;
  try {
    // EXIF 회전값은 그림에 반영한 뒤 버린다 (세로 사진이 눕지 않게)
    bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch { return null; }
  try {
    const k = Math.min(1, CLEAN_MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // 투명한 곳이 실제로 있는가 — 254·255는 「불투명」 (숨긴 정보가 254/255로 새겨진다)
    let transparent = false;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { transparent = true; break; }

    if (!transparent) {
      // 흰 바탕에 다시 그려 JPG로 — 투명도 채널이 통째로 사라진다
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      return await toBlob(cv, 'image/jpeg', CLEAN_JPEG_QUALITY);
    }
    // 투명 배경 유지 — 색·투명도의 끝자리를 지워 숨긴 정보를 없앤다 (거의 불투명한 곳은 완전 불투명으로)
    for (let i = 0; i < d.length; i += 4) {
      d[i] &= 0xfe; d[i + 1] &= 0xfe; d[i + 2] &= 0xfe;
      d[i + 3] = d[i + 3] >= 250 ? 255 : d[i + 3] & 0xfe;
    }
    ctx.putImageData(img, 0, 0);
    return await toBlob(cv, 'image/png');
  } catch {
    return null;
  } finally {
    bmp.close();
  }
}

function toBlob(cv: HTMLCanvasElement, type: string, q?: number): Promise<Blob | null> {
  return new Promise(res => cv.toBlob(b => res(b), type, q));
}

/** 저장소 주소가 이미 정리된 파일인가 (`….c.jpg` / `….c.png`) */
export const isCleanedRef = (ref: string) =>
  new RegExp(`\\.${CLEAN_MARK}\\.(jpg|png)(?:[?#]|$)`, 'i').test(decodeURIComponent(ref));

/** 정리 대상 이미지 주소인가 — 확장자로 판단 (gif·svg·글꼴·텍스트 제외) */
export const isImageRef = (ref: string) =>
  /\.(png|jpe?g|webp|bmp|avif)(?:[?#]|$)/i.test(decodeURIComponent(ref));
