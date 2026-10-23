// 공유용 짧은 이미지 주소 — /e/<파일이름> 으로 오면 이 홈 Firebase Storage의 ohome/<파일이름>을 대신 가져다 준다.
// 긴 firebasestorage 주소 대신 홈 주소로 사진(배너 등)을 나눠 줄 때 쓴다.
import config from '../../../../public/ohome.config.json';

const BUCKET = (config as { storageBucket?: string }).storageBucket;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!BUCKET || !/^[A-Za-z0-9._-]{1,80}$/.test(file)) return new Response('Not found', { status: 404 });
  let res: Response;
  try {
    res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/ohome%2F${file}?alt=media`);
  } catch {
    return new Response('Bad gateway', { status: 502 });
  }
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
