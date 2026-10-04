# Self-host Deployment

本指南适用于 single-user personal system 的 Linux 自托管部署。推荐使用 Native Node.js、systemd、Caddy 和服务器端 SQLite；不需要 Docker、Kubernetes、PM2、PostgreSQL 或云厂商 SDK。

## Requirements

- Debian / Ubuntu compatible Linux
- ARM64 或 x86_64
- Node.js >= 20.16.0，或 Node.js >= 22.3.0（`pdf-parse@2.4.5` / `mammoth@1.13.0` 的运行时要求）
- npm、Git、systemd
- `sqlite3` CLI（live / scheduled backup 必需）
- Caddy 2
- 一个解析到服务器的域名（启用公网 HTTPS 时）

推荐目录：

```text
/opt/ee-knowledge                         # 应用代码
/var/lib/ee-knowledge/ee-knowledge.db     # 生产 SQLite
/etc/ee-knowledge/ee-knowledge.env        # 生产环境变量
/var/backups/ee-knowledge                 # Primary scheduled backup
/mnt/ee-knowledge-secondary               # 可选：独立 USB SSD / NAS 挂载点
```

生产数据库不应放在仓库的 `prisma/dev.db`。应用服务使用非 root 用户 `ee-knowledge` 运行。

## Initial install

以下命令展示部署顺序。请把 `<repository-url>` 和 `<domain>` 替换为实际值；不要把凭证写进 shell history 或仓库。

```bash
sudo useradd --system --home /opt/ee-knowledge --shell /usr/sbin/nologin ee-knowledge
sudo install -d -o ee-knowledge -g ee-knowledge /opt/ee-knowledge
sudo install -d -o ee-knowledge -g ee-knowledge /var/lib/ee-knowledge
sudo install -d -o ee-knowledge -g ee-knowledge /var/backups/ee-knowledge
sudo install -d -o root -g ee-knowledge -m 0750 /etc/ee-knowledge
sudo -u ee-knowledge git clone <repository-url> /opt/ee-knowledge
cd /opt/ee-knowledge
sudo -u ee-knowledge npm ci
# ARM64 / Orange Pi / RK3588：必须在目标机器本机执行 npm ci，不能复制其他架构的 node_modules。
# Fresh-server build does not require production secrets or DATABASE_URL.
sudo -u ee-knowledge npm run build
sudo cp deploy/ee-knowledge.env.example /etc/ee-knowledge/ee-knowledge.env
sudo chown root:ee-knowledge /etc/ee-knowledge/ee-knowledge.env
sudo chmod 0640 /etc/ee-knowledge/ee-knowledge.env
```

Debian / Ubuntu 安装系统 SQLite CLI：

```bash
sudo apt update
sudo apt install sqlite3
```

编辑 `/etc/ee-knowledge/ee-knowledge.env`，填写服务器绝对路径和凭证：

```env
NODE_ENV="production"
DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db"
EE_AUTH_PASSWORD_HASH="..."
EE_AUTH_SESSION_SECRET="..."
EE_AUTH_SESSION_TTL_DAYS="30"
```

在安全的交互式终端生成认证值。systemd EnvironmentFile 使用 raw hash；如果只是配置本地 Next.js `.env`，请使用 dotenv-safe 输出，见 [`docs/AUTH.md`](AUTH.md)：

```bash
cd /opt/ee-knowledge
sudo -u ee-knowledge npm run auth:hash-password
sudo -u ee-knowledge npm run auth:generate-secret
```

首次部署默认不运行 Demo Seed。安装 systemd unit 后，首次启动会由 `EnvironmentFile=/etc/ee-knowledge/ee-knowledge.env` 注入全部生产变量，并依次执行 `deploy:check`、`db`、`db:check` 和 `start:prod`：

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

`deploy:check` 只验证环境，不创建数据库；`db` 通过 Prisma `migrate deploy` 应用已有 migration，不会执行 `db:seed`、`db:setup`、`db push` 或 `migrate reset`。不要在未加载 production EnvironmentFile 的普通 shell 中运行这些生产检查命令。

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
sudo -u ee-knowledge env DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db" npm run db:backup -- --output=/var/backups/ee-knowledge
sudo -u ee-knowledge git pull --ff-only
sudo -u ee-knowledge npm ci
sudo -u ee-knowledge npm run build
sudo systemctl start ee-knowledge
```

备份命令只注入不含 secret 的 `DATABASE_URL`；服务重新启动时由 systemd EnvironmentFile 读取全部 production env，并自动执行 deploy:check、migration deploy 和 db:check。备份脚本会检查 SQLite 文件头并拒绝带有 `.db-journal`、`.db-wal` 或 `.db-shm` sidecar 的数据库。不要绕过这些检查，也不要在应用仍写入数据库时复制文件。升级后通过 HTTPS 页面、登录、课程页面和管理 API 做基本 smoke test。

## Scheduled backup

生产环境模板包含：

```env
EE_BACKUP_DIR="/var/backups/ee-knowledge"
EE_BACKUP_SECONDARY_DIR=""
EE_BACKUP_RETENTION_COUNT="14"
```

Primary scheduled backup 不要求停止主应用。它使用 SQLite online backup、`.partial` 临时文件和 `integrity_check`，文件名为 `ee-knowledge-scheduled-YYYYMMDD-HHMMSS.db`，默认保留最新 14 个 scheduled backup。Retention 不会删除 `db:backup` 创建的 `ee-knowledge-YYYYMMDD-HHMMSS.db` cold backup，也不会删除 `db:backup:live` 创建的 `ee-knowledge-live-YYYYMMDD-HHMMSS.db`。先安装并复制 unit：

```bash
sudo cp /opt/ee-knowledge/deploy/systemd/ee-knowledge-backup.service /etc/systemd/system/
sudo cp /opt/ee-knowledge/deploy/systemd/ee-knowledge-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

首次启用 timer 前，使用与定时任务相同的 systemd 环境手动执行一次：

```bash
sudo systemctl start ee-knowledge-backup.service
sudo systemctl status ee-knowledge-backup.service
sudo journalctl -u ee-knowledge-backup.service -n 100 --no-pager
```

确认成功后启用每日 03:30（带最多 10 分钟随机延迟、关机补跑）的 timer：

```bash
sudo systemctl enable --now ee-knowledge-backup.timer
sudo systemctl list-timers ee-knowledge-backup.timer
```

backup service 不依赖、不停止也不重启 `ee-knowledge.service`。备份失败只会让备份 service/timer 进入失败状态，主应用继续运行。日志会记录 Primary 文件、integrity、Secondary 状态、SHA-256 和 retention 数量；不会记录认证凭证。

## Secondary mounted filesystem

Secondary 是可选能力。没有第二块盘时保持 `EE_BACKUP_SECONDARY_DIR=""`，Primary scheduled backup 仍正常运行。

推荐挂载点：

```text
/mnt/ee-knowledge-secondary
```

创建目录不等于 Secondary 已准备好。必须先把 USB SSD、NAS/NFS 或 SMB 等独立 filesystem 真正挂载到该路径，再检查：

```bash
sudo install -d -o ee-knowledge -g ee-knowledge /mnt/ee-knowledge-secondary
findmnt /mnt/ee-knowledge-secondary
df -T /var/backups/ee-knowledge /mnt/ee-knowledge-secondary
```

确认 `findmnt` 显示真实挂载且 `df -T` 与 Primary filesystem 不同后，把 `/etc/ee-knowledge/ee-knowledge.env` 改为：

```env
EE_BACKUP_SECONDARY_DIR="/mnt/ee-knowledge-secondary"
```

配置后，备份会在任务开始和真正复制前都检查 Secondary 存在、可写且位于不同 filesystem；NAS/USB 掉线导致挂载点退化为主盘普通目录时也会失败，不会悄悄写回主系统盘。Secondary 复制失败时 Primary final backup 保留，本轮 `.partial` 会清理，备份 service 返回非零状态。

## Orange Pi / RK3588

ARM64 Linux 使用与普通 Debian/Ubuntu 相同的目录、systemd unit、Caddy 配置和环境变量，不建立 Orange Pi 专用代码分支。建议：

```text
NVMe：
/var/lib/ee-knowledge              production SQLite
/var/backups/ee-knowledge          Primary backup

USB SSD / NAS：
/mnt/ee-knowledge-secondary        Secondary backup
```

Primary 同一 NVMe 主要防误删、逻辑损坏和错误更新，不能防 NVMe 物理故障；独立 USB SSD/NAS Secondary 才能增加这一层保护。Node.js 应使用满足 `>= 20.16.0` 或 `>= 22.3.0` 的正式 ARM64 版本，并在目标设备执行 `npm ci`，以安装目标架构对应的原生依赖；不能复制其他架构的 `node_modules`。

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

该命令应在 systemd 已加载 `/etc/ee-knowledge/ee-knowledge.env` 的服务上下文中运行；本地开发 `.env` 不应被当作 production env。直接在普通 shell 中运行而没有显式加载 production EnvironmentFile，不能代表生产检查结果。本仓库验证不能替代目标机器上的真实 systemd、Caddy 公网 HTTPS 或 Android 安装验收。部署完成后应记录服务日志、HTTPS 登录和数据库读写结果。

本轮未实现：Docker/Kubernetes/PM2、PostgreSQL、offline writes、业务 service-worker cache、Local AI 和 v0.4 学习体验增强。真实 USB/NAS、systemd timer、HTTPS 和 Android 安装仍需目标环境验收。
