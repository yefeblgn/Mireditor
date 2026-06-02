import type { AIProvider, AISettings, ImageGenOptions } from './types';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

interface ORMessageImage {
  type: string;
  image_url?: { url: string };
}

/** OpenRouter yanıtından ilk görüntü data URL'sini çıkarır. */
function extractImage(json: any): string | null {
  const msg = json?.choices?.[0]?.message;
  if (!msg) return null;

  // 1) message.images dizisi (görüntü-çıkışlı modeller)
  if (Array.isArray(msg.images)) {
    for (const im of msg.images as ORMessageImage[]) {
      const url = im?.image_url?.url;
      if (url && url.startsWith('data:image')) return url;
    }
  }
  // 2) content içinde data URL veya markdown görüntü
  const content = msg.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c: any) => c?.text ?? '').join(' ') : '';
  const m = text.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
  if (m) return m[0];
  return null;
}

export function createOpenRouterProvider(settings: AISettings): AIProvider {
  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
    'HTTP-Referer': 'https://mireditor.app',
    'X-Title': 'Mireditor',
  });

  async function call(messages: any[]): Promise<string> {
    if (!settings.apiKey.trim()) throw new Error('OpenRouter API anahtarı girilmemiş. AI ayarlarından ekleyin.');
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ model: settings.imageModel, messages, modalities: ['image', 'text'] }),
      });
    } catch {
      throw new Error('OpenRouter\'a bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    }
    if (!res.ok) {
      let detail = '';
      try {
        const e = await res.json();
        detail = e?.error?.message || '';
      } catch {
        /* yok say */
      }
      if (res.status === 401) throw new Error('API anahtarı geçersiz (401).');
      if (res.status === 402) throw new Error('OpenRouter krediniz yetersiz (402).');
      throw new Error(`OpenRouter hatası ${res.status}: ${detail || res.statusText}`);
    }
    const json = await res.json();
    const img = extractImage(json);
    if (!img) {
      throw new Error('Model görüntü döndürmedi. Görüntü üretebilen bir model seçtiğinizden emin olun.');
    }
    return img;
  }

  return {
    id: 'openrouter',
    label: 'OpenRouter',
    async textToImage(prompt: string, opts: ImageGenOptions): Promise<string> {
      const sized = `${prompt}\n\n(Yaklaşık ${opts.width}x${opts.height} piksel, yüksek kalite görüntü üret.)`;
      return call([{ role: 'user', content: [{ type: 'text', text: sized }] }]);
    },
    async editImage(imageDataUrl, prompt, _maskDataUrl, _opts): Promise<string> {
      return call([
        {
          role: 'user',
          content: [
            { type: 'text', text: `Bu görüntüyü şu talimata göre düzenle: ${prompt}` },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ]);
    },
  };
}
