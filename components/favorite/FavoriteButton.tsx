"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/features/favorites/actions";

export function FavoriteButton({ knowledgePointId, initialFavorited }: { knowledgePointId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="favorite-control"><button type="button" className={`favorite-button ${favorited ? "favorited" : ""}`} aria-label={favorited ? "取消收藏" : "收藏知识点"} disabled={pending} onClick={() => { setError(""); startTransition(async () => { const result = await toggleFavorite({ knowledgePointId }); if (result.ok) setFavorited(result.favorited); else setError(result.error); }); }}>{pending ? "处理中……" : favorited ? "★ 已收藏" : "☆ 收藏"}</button>{error && <small className="action-error">{error}</small>}</div>;
}
