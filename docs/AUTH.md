# Authentication

## Scope

当前认证只支持 single-user personal system。项目不提供注册、多用户、OAuth、邮箱找回、RBAC 或数据库 Session。

## Setup

在项目目录生成密码 hash 和 session secret：

```powershell
npm run auth:hash-password
npm run auth:generate-secret
```

将命令输出填入本机 `.env`：

```env
EE_AUTH_PASSWORD_HASH="..."
EE_AUTH_SESSION_SECRET="..."
EE_AUTH_SESSION_TTL_DAYS="30"
```

`.env.example` 只包含空配置，不包含真实凭证。密码长度为 12 到 128 个字符；密码 hash 使用 Node 内置 `crypto.scrypt`。

## Login and Logout

未认证访问业务页面会进入 `/login`，登录成功后回到安全的站内 `next` 路径。登录创建 `ee_session` 签名 HttpOnly cookie；退出登录使用 `POST /api/auth/logout` 清除 cookie。

页面和管理 API 默认私有。必要的登录端点、PWA manifest、图标和 Next 静态资源保持公开；未认证 API 返回 401 JSON。

## Password Change

重新运行 `npm run auth:hash-password`，再更新 `.env` 中的 `EE_AUTH_PASSWORD_HASH`。Session 签名同时依赖密码 hash 和 `EE_AUTH_SESSION_SECRET`，更新任一配置会使旧 session 自动失效。

## Production

Remote deployment requires HTTPS. `Secure` cookie 只在 production 环境开启；本地 HTTP 开发环境使用 `Secure=false`。正式 HTTPS/self-host 部署属于 `v0.3.0-alpha.3`。

当前认证不把密码、Session 或个人数据写入 Prisma/SQLite。PWA 与桌面浏览器访问同一台服务时仍使用服务器端数据源；本阶段不提供 offline writes 或同步。

## Recovery

忘记密码时，在服务器上重新运行 `npm run auth:hash-password` 并更新 `.env`，重启应用后使用新密码登录。项目没有邮箱找回流程。
