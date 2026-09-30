"use client";
/* A plain img keeps media sources provider-agnostic until storage is designed. */
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { isSafeImageSource } from "@/lib/content/url-safety";
import { directMediaProvider } from "@/lib/media/provider";
import type { MediaAssetRef } from "@/lib/media/types";

export function KnowledgeImage({ src, alt, caption, width, height }: MediaAssetRef) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = directMediaProvider.resolve({ src, alt, caption, width, height });
  const invalid = !isSafeImageSource(resolvedSrc);
  return <figure className="knowledge-image">
    {invalid || failed ? <div className="knowledge-image-fallback" role="img" aria-label={alt}><span>{alt}</span><small>图片加载失败</small></div> : <img src={resolvedSrc} alt={alt} width={width} height={height} onError={() => setFailed(true)} />}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
