export type MediaAssetRef = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export interface MediaProvider {
  resolve(asset: MediaAssetRef): string;
}
