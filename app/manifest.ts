import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "研电 · EE Knowledge",
    short_name: "研电",
    description: "电子信息专业个人知识库、复习与学习系统",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#101827",
    lang: "zh-CN",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/ee-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/ee-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/ee-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}