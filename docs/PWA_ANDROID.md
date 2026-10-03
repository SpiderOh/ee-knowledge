# PWA 与 Android 安装基础

## Current stage

当前候选版本是 `v0.3.0-rc.1`：PWA、Android 安装基础、移动端体验、single-user Authentication、Linux self-host deployment、scheduled backup 和隔离运行时回归。

## Install model

EE Knowledge 使用 Web PWA，不是原生 APK。App Router manifest、静态图标和 standalone display 为浏览器安装提供基础元数据。

## Android

正式部署到 HTTPS 后，可以在 Android Chrome / Chromium 中：

1. 打开 EE Knowledge 的 HTTPS URL。
2. 选择浏览器的 Install app / 添加到主屏幕入口。
3. 从桌面图标以 standalone window 启动，默认进入 `/`。

本 alpha 提供 Caddy HTTPS 部署模板，但未声称已经完成目标服务器上的公网 HTTPS 或远程 Android 安装验收。

## Data

PWA 安装不会在手机保存主 SQLite。未来云端版本以服务器 SQLite 作为 canonical source，桌面浏览器和 Android PWA 访问同一份数据。

手机卸载 PWA 或清理 App 数据不会删除服务器数据库。

## Offline

alpha.1 不支持 offline writes、离线写入队列、业务数据镜像、IndexedDB 数据库镜像或 background sync。动态个人数据继续通过正常网络请求访问，不使用 service worker 缓存业务页面或 API 响应。

## Scope boundaries

本阶段已包含 single-user Authentication、self-host deployment、scheduled backup、secondary backup destination 基础和隔离运行时回归；不包含 Capacitor APK、原生 Android UI、多用户或同步冲突解决。下一阶段为 `v0.3.0` stable 发布。
