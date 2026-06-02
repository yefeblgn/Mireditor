export interface ImageGenOptions {
  width: number;
  height: number;
}

export interface AIProvider {
  id: string;
  label: string;
  /** Metinden görüntü üretir, data URL döner. */
  textToImage(prompt: string, opts: ImageGenOptions): Promise<string>;
  /** Kaynak görüntüyü (opsiyonel maske ile) prompt'a göre düzenler/doldurur. */
  editImage(
    imageDataUrl: string,
    prompt: string,
    maskDataUrl: string | null,
    opts: ImageGenOptions
  ): Promise<string>;
}

export interface AISettings {
  provider: 'openrouter';
  apiKey: string;
  imageModel: string;
}
