# Self-host Deployment

本指南适用于 single-user personal system 的 Linux 自托管部署。推荐使用 Native Node.js、systemd、Caddy 和服务器端 SQLite；不需要 Docker、Kubernetes、PM2、PostgreSQL 或云厂商 SDK。

## Requirements

- Debian / Ubuntu compatible Linux
- ARM64 或 x86_64
- Node.js 20 LTS 或更高版本
- npm、Git、systemd
- Caddy 2
- 一个解析到服务器的域名（启用公网 HTTPS 时）

推荐目录：

```text
/opt/ee-knowledge                         # 应用代码
/var/lib/ee-knowledge/ee-knowledge.db     # 生产 SQLite
/etc/ee-knowledge/ee-knowledge.env        # 生产环境变量
/var/backups/ee-knowledge                 # 手动备份目录，可预留
```

生产数据库不应放在仓库的 `prisma/dev.db`。应用服务使用非 root 用户 `ee-knowledge` 运行。

## Initial install

以下命令展示部署顺序。请把 `<repository-url>` 和 `<domain>` 替换为实际值；不要把凭证写进 shell history 或仓库。

```bash
sudo useradd --system --home /opt/ee-knowledge --shell /usr/sbin/nologin ee-knowledge
sudo install -d -o ee-knowledge -g ee-knowledge /opt/ee-knowledge
sudo install -d -o ee-knowledge -g ee-knowledge /var/lib/ee-knowledge
sudo install -d -o root -g ee-knowledge -m 0750 /etc/ee-knowledge
sudo -u ee-knowledge git clone <repository-url> /opt/ee-knowledge
cd /opt/ee-knowledge
sudo -u ee-knowledge npm ci
sudo -u ee-knowledge npm run build
sudo cp deploy/ee-knowledge.env.example /etc/ee-knowledge/ee-knowledge.env
sudo chown root:ee-knowledge /etc/ee-knowledge/ee-knowledge.env
sudo chmod 0640 /etc/ee-knowledge/ee-knowledge.env
```

编辑 `/etc/ee-knowledge/ee-knowledge.env`，填写服务器绝对路径和凭证：

```env
NODE_ENV="production"
DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db"
EE_AUTH_PASSWORD_HASH="..."
EE_AUTH_SESSION_SECRET="..."
EE_AUTH_SESSION_TTL_DAYS="30"
```

在安全的交互式终端生成认证值：

```bash
cd /opt/ee-knowledge
sudo -u ee-knowledge npm run auth:hash-password
sudo -u ee-knowledge npm run auth:generate-secret
```

首次部署默认不运行 Demo Seed。应用只使用仓库已有 migration 初始化生产库：

```bash
sudo -u ee-knowledge npm run deploy:check
sudo -u ee-knowledge npm run db
sudo -u ee-knowledge npm run db:check
```

`deploy:check` 只验证环境，不创建数据库、不运行 migration。首次运行 `npm run db` 会通过 Prisma `migrate deploy` 应用已有 migration；它不会执行 `db:seed`、`db:setup`、`db push` 或 `migrate reset`。

## systemd

先确认 `npm` 路径：

```bash
command -v npm
```

模板默认使用 `/usr/bin/npm`。如果目标系统路径不同，请复制 unit 后调整 `ExecStartPre` 和 `ExecStart` 中的路径。安装并启动：

```bash
sudo cp /opt/ee-knowledge/deploy/systemd/ee-knowledge.service /etc/systemd/system/ee-knowledge.service
sudo systemctl daemon-reload
sudo systemctl enable --now ee-knowledge
sudo systemctl status ee-knowledge
sudo journalctl -u ee-knowledge -f
```

启动顺序是 `deploy:check`、`db`、`db:check`、`start:prod`。Next.js 只监听 `127.0.0.1:3000`；公网流量应由 Caddy 终止 HTTPS 后转发。unit 使用 `NoNewPrivileges`、`PrivateTmp`、`ProtectHome` 和 `ProtectSystem`，并只允许生产数据目录写入。

## Caddy HTTPS

复制模板并替换 `YOUR_DOMAIN`：

```bash
sudo cp /opt/ee-knowledge/deploy/Caddyfile.example /etc/caddy/Caddyfile
sudoedit /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy 自动 HTTPS 需要域名 DNS 指向服务器，并且 TCP 80/443 从公网可达。3000 只供本机 reverse proxy 使用，不应开放到公网。防火墙示例（不会由项目自动执行）：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

不要执行 `ufw allow 3000`。

## Safe update

每次升级前停止服务并做手动 SQLite 备份：

```bash
sudo systemctl stop ee-knowledge
cd /opt/ee-knowledge
sudo -u ee-knowledge npm run db:backup -- --output=/var/backups/ee-knowledge
sudo -u ee-knowledge git pull --ff-only
sudo -u ee-knowledge npm ci
sudo -u ee-knowledge npm run build
sudo -u ee-knowledge npm run deploy:check
sudo -u ee-knowledge npm run db
sudo -u ee-knowledge npm run db:check
sudo systemctl start ee-knowledge
```

备份脚本会检查 SQLite 文件头并拒绝带有 `.db-journal`、`.db-wal` 或 `.db-shm` sidecar 的数据库。不要绕过这些检查，也不要在应用仍写入数据库时复制文件。升级后通过 HTTPS 页面、登录、课程页面和管理 API 做基本 smoke test。

本 alpha 只记录手动升级前备份流程，不实现 scheduled backup 或 secondary backup destination。

## Orange Pi / RK3588

ARM64 Linux 使用与普通 Debian/Ubuntu 相同的目录、systemd unit、Caddy 配置和环境变量，不建立 Orange Pi 专用代码分支。建议把 `/var/lib/ee-knowledge` 放在 NVMe，而不是 TF 卡；Node.js 应使用正式 ARM64 版本，并在目标设备执行 `npm ci`，以安装目标架构对应的原生依赖。

家庭 NAT 环境通常需要公网域名、DNS、80/443 端口转发或等效网络能力，Caddy 才能完成公网证书签发。Tailscale 或其他 private network HTTPS 可以作为可选方向，但本项目不依赖它，也不提供自动安装脚本。

## VPS

VPS 使用同一套部署结构：域名 DNS 指向 VPS，Caddy 监听 HTTPS 并反向代理到 `127.0.0.1:3000`，Next.js 通过 Prisma 使用 `/var/lib/ee-knowledge/ee-knowledge.db`。应用代码不区分 VPS 和 ARM64 设备。

## Verification and limits

静态部署检查：

```bash
npm run verify:deploy
```

生产环境检查必须在已经创建 parent directory 并加载 `/etc/ee-knowledge/ee-knowledge.env` 的用户上下文中执行：

```bash
npm run deploy:check
```

本仓库验证不能替代目标机器上的真实 systemd、Caddy 公网 HTTPS 或 Android 安装验收。部署完成后应记录服务日志、HTTPS 登录和数据库读写结果。

本轮未实现：scheduled backup、secondary backup destination、Docker/Kubernetes/PM2、PostgreSQL、offline writes、业务 service-worker cache、Local AI 和 v0.4 学习体验增强。
