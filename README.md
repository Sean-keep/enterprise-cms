# 企业官网 CMS

面向企业官网的内容管理系统。内容在后台用**结构化表单**维护，官网对公众
服务端渲染 / 构建期静态化 —— 公开页面必须 SEO 友好，纯客户端 SPA 是错的。

## 快速开始

```bash
cd cms
cp .env.example .env
docker compose up
```

起来后：

| 入口 | 地址 |
|---|---|
| 官网 | http://localhost:8890 |
| 后台 | http://localhost:8890/admin |
| 后端 API（调试） | http://localhost:8891/api/health |

初始账号（**登录后立刻改密码**）：

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin@example.com` | `admin12345` | 管理员 |
| `editor@example.com` | `editor12345` | 编辑（不能管用户/菜单/站点配置） |

首次启动会自动建库、写入示例内容（首页 / 关于 / 联系 / 隐私政策、
两篇新闻、三条产品服务案例、主导航与页脚菜单）。

## 目录

```
cms/
├── docker-compose.yml        # backend + web 两个服务，无 DB 容器
├── packages/shared/          # 前后端共享的 zod 契约与枚举
├── backend/                  # Fastify + Prisma + SQLite 内容服务
│   ├── prisma/schema.prisma
│   ├── prisma/seed.ts        # 幂等初始数据
│   └── src/
│       ├── routes/           # public.ts（免鉴权读）· admin.ts（需登录写）
│       ├── services/         # 业务层，与 HTTP 框架无关
│       └── lib/              # sanitize · revalidate · password · json
└── web/                      # Next.js 15：公开站 + /admin 后台
    └── src/
        ├── app/(site)/       # 官网，SSG / ISR
        ├── app/admin/        # 后台，全动态
        ├── app/api/          # revalidate webhook · contact 转发
        └── templates/        # home / about / contact / generic
```

---

## 架构决策记录

### 1. 后端独立成服务，不塞进 Next.js

内容 API 是一个独立服务。官网只是它的第一个消费者 —— 将来小程序、App、
第三方对接直接复用同一套 API，不必从 Next.js 里再挖一遍。

web **不碰数据库**，只走 HTTP。这是前后端的边界，也是以后能独立部署、
独立扩缩容的前提。

### 2. SQLite，不是 PostgreSQL

企业官网的写入量是「运营改文章」这个量级。SQLite 单文件扛得住，而且
**只有 backend 一个进程写库**，web 只读 HTTP —— SQLite 的并发写限制
根本不触发。

少掉的东西：postgres 容器、healthcheck、volume、迁移流水线。
真要换 PostgreSQL，改 `schema.prisma` 的 datasource + 一次 migrate。

### 3. 页面内容走类型化 JSON，不是一堆扩展表

首页 / 关于 / 联系这类页面**版式固定、内容不同**。如果每个字段都建成真列，
首页的 hero 就得有 `page_home.hero_title`、关于的里程碑得有子表
`page_about_milestones` —— 加一个模板字段要改 schema + migrate + 表单。

改成这样：

```
pages
  id  slug  template  status  published_at
  title  summary
  content  TEXT   ← JSON，形状由 template 决定
  meta     TEXT   ← JSON，SEO
```

`content` 的形状由 `packages/shared` 里的 zod 按 `template` 分派（
`home` / `about` / `contact` / `generic`），前后端共用同一份定义。

- 运营改的是**固定槽位**，表单渲染成结构化子表单，增删条目但改不了结构
- 开发加一个槽位 = 改一个 zod schema + 一个表单字段，**不迁移数据库**
- 三方对齐：zod schema ↔ 后台表单 ↔ 前台模板

**边界**：要查询 / 筛选 / 分页 / 排序的内容（新闻、产品、留言、用户、
媒体）继续用真实列。那部分 JSON 化是倒退。

### 4. revalidate webhook 是正确性要求，不是优化

公开页是 SSG / ISR，构建后就是静态的。后台改完内容如果不让缓存失效，
就会「后台改了，官网不更新」。

链路：backend 写库成功 → 调 `web` 的 `POST /api/revalidate`（shared secret）
→ 按 tag 失效（`page:{slug}`、`posts`、`products`、`site`…）。

tag 清单集中在 `backend/src/lib/revalidate.ts`，不要在 service 里散着打 HTTP。
后台「站点设置」里留了一个强制刷新按钮做逃生门。

### 5. 手写 session，不引 auth 库

需求就是「登录 + 两个角色」。argon2 的 node 绑定要走 node-gyp，骨架阶段
为一个函数引一串构建链不划算，所以口令哈希用 Node 内置 `scrypt`
（内存硬，抗 GPU 暴破）。真要换 argon2 只改 `lib/password.ts` 两个导出。

cookie 只放随机明文 token，库存 sha256 —— 库被拖走也伪造不了会话。

### 6. 富文本：清洗两道

正文存 HTML。**入库前一次、出库前一次**，白名单一致。只在 admin 能写是
不够的 —— 一旦库被绕过（备份还原、直接改库），出库这道是最后防线。

本轮正文编辑器是「textarea + 标签工具条」，接口是 `{ value, onChange }`，
和 Tiptap 完全一致，以后换 Tiptap 只动 `components/admin/RichText.tsx`
一个文件。

---

## 数据模型速览

| 表 | 用途 | 存储形态 |
|---|---|---|
| `pages` | 页面（模板分派） | `content` / `meta` 为 JSON |
| `posts` / `post_categories` | 新闻 | 真实列 |
| `products` / `product_categories` | 产品/服务/案例（`kind` 区分） | 真实列，`highlights` 为 JSON |
| `menus` / `menu_items` | 导航（支持二级） | 真实列 |
| `form_submissions` | 表单收集 | 真实列 |
| `users` / `sessions` | 用户与会话 | 真实列 |
| `media` | 媒体库 | 真实列，存 `path` 不存 URL |
| `site_settings` | 站点配置（单行） | 真实列 |

公开读一律经过 `services/scope.ts` 的 `publishedScope`
（`status=published AND published_at <= now`）—— 这是防 draft 泄露的唯一出口。

---

## API

**公开读**（免鉴权，只返回已发布）：

```
GET  /api/public/site              站点配置 + 全部菜单
GET  /api/public/pages/:slug
GET  /api/public/posts?category=&page=&pageSize=
GET  /api/public/posts/:slug
GET  /api/public/products?kind=&category=&page=&pageSize=
GET  /api/public/products/:slug
POST /api/public/contact           提交留言（IP 限流）
```

**后台**（session cookie）：

```
POST /api/admin/auth/login · /logout · GET /me
CRUD /api/admin/pages · posts · products · …
GET  /api/admin/forms · PATCH /:id
POST /api/admin/revalidate         缓存逃生门
```

响应：成功 `{ data }`，失败 `{ error: { code, message, issues? } }`。
HTTP 状态码表达结果，`error.code` 给前端做分支。

---

## 验证清单

骨架交付时已逐条跑通（本地 `tsx` + `next dev` 与 `docker compose up` 各一遍）：

1. `docker compose up` 起来，`/api/health` 返回 ok
2. 用 admin 账号登录 `/admin`，四类内容各做一次增删改查
3. 在「页面」里切换首页的模板，看下面的字段跟着变（`generic` → `contact` 后字段整组换掉）
4. 官网访问首页 / 关于 / 联系 / 新闻 / 产品，内容与后台一致
5. 改一篇文章标题 → 保存 → 官网刷新后能变（不重启、不等 ISR 窗口）
6. 官网提交联系表单 → 后台「留言」能查到
7. `curl http://localhost:8891/api/public/posts` 确认草稿不外泄（详情 404、列表查不到、列表页不出现）
8. `/sitemap.xml` 覆盖已发布页面；`/robots.txt` 禁止抓 `/admin`

## 本机起法（不走 Docker）

```bash
npm install                       # 在仓库根上装，workspaces 才能解析 @cms/shared
npm run db:push && npm run db:seed

cd backend && npx tsx watch --tsconfig ./tsconfig.json src/server.ts
cd web && npx next dev -p 3000
```

后端命令里的 `--tsconfig ./tsconfig.json` 不是可有可无：tsx 会向上找 tsconfig，
在 monorepo 里可能撞上 `web/tsconfig.json` 的 `paths`，解析结果就是
`Cannot find module '.../xxx.js'`。写死一份最省事。

## 镜像源

国内机器 `docker pull node:22-bookworm-slim` 可能报 `not found`，但 mirror 里其实有 ——
是短名没走 mirror。拉全路径再打回官方名，compose 文件就不用改：

```bash
docker tag <your-mirror>/docker.io/library/node:22-bookworm-slim node:22-bookworm-slim
docker compose up -d
```

## 已知边界（不在本轮）

- 富文本升级到 Tiptap（接口已预留）
- 细粒度权限、审批流、内容版本、定时发布
- 测试（建议 service 层 vitest + Playwright 主流程冒烟）
- 精细 UI / 设计系统、国际化、搜索、多站点
- 媒体换 S3（`StorageAdapter` 接口已预留，库里存的是 `path` 不是 URL）
