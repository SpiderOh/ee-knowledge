import type { MediaAssetRef, MediaProvider } from "./types";

export class DirectMediaProvider implements MediaProvider {
  resolve(asset: MediaAssetRef) {
    return asset.src;
  }
}

export const directMediaProvider = new DirectMediaProvider();
