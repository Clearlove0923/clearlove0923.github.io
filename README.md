# SteamCN-GameLauncher 产品站

项目主页的静态站点源码，托管在 GitHub Pages。
站点地址：`https://clearlove0923.github.io/`

纯静态 HTML + CSS + 少量原生 JavaScript，没有构建步骤、没有框架、没有后端。
改完文件推一次即可上线。

---

## 目录结构

```
.
├─ index.html              首页（入口，文件名不可改）
├─ features.html           功能展示
├─ tutorial.html           使用教程
├─ docs.html               文档
├─ about.html              关于此软件
├─ docs/
│  └─ learning-guide.html  学习与二次开发指南
├─ examples/
│  ├─ md.html              文档转网页（可实际使用）
│  ├─ vite.html            前端构建产物示例
│  └─ ai.html              AI 生成页面示例（成品展示）
├─ 404.html                404 页面（GitHub Pages 会自动使用）
├─ assets/
│  ├─ hero-bg.jpg          首页背景图
│  └─ favicon.svg          站点图标
├─ downloads/              安装包本地备份（已被 .gitignore 忽略，不随仓库提交）
├─ css/
│  └─ style.css            全站样式
├─ robots.txt              搜索引擎抓取规则
├─ sitemap.xml             站点地图
├─ version.json            下载区配置（版本、链接、提取码）
├─ deploy.sh               一键发布脚本
├─ update-release.sh       更新版本号与下载链接
├─ rollback.sh             一键回滚到历史版本
├─ AGENTS.md               AI 协作与版本发布约束（规则以此为准）
└─ README.md               本文件
```

---

## 日常更新

改完任意文件后，在项目根目录执行：

```bash
bash deploy.sh "这次改了什么"
```

脚本会自动 `git add / commit / push`，1~2 分钟后线上生效，无需再去 GitHub 设置页操作。

首次在新环境使用时，脚本会询问仓库地址，填：

```
https://github.com/Clearlove0923/clearlove0923.github.io.git
```

---

## 下载区怎么改

**现阶段以 GitHub Release 为主分发渠道**，官网只是展示与跳转。

```json
{
  "version": "v3.1.5",
  "date": "2026-09-30",
  "size": "133 MB",
  "repo": "Clearlove0923/SteamCN-GameLauncher",
  "autoLatest": true,
  "windows": { "label": "下载安装包（133 MB）", "url": "https://github.com/<仓库>/releases/download/v3.1.5/....exe" },
  "mirror":  { "label": "备用下载（国内加速）", "url": "https://...", "pwd": "e2me" },
  "changelog": "https://github.com/<仓库>/releases"
}
```

| 字段 | 说明 |
|---|---|
| `repo` | Release 所在仓库（`用户名/仓库名`），自动获取最新版本时读取 |
| `urlPattern` | 版本化直链模板，`{ver}` 换成版本号、`{repo}` 换成仓库；配合 `--auto` 使用 |
| `autoLatest` | `true` 时页面会读取该仓库最新 Release 的 exe 覆盖主按钮链接与版本号；设 `false` 则只用 `windows.url` |
| `windows.url` | 主下载按钮的兜底地址，填当前版本的 Release 直链（点击即下载） |
| `mirror.url` | 备用下载按钮，通常填网盘分享链接 |
| `mirror.pwd` | 备用下载的提取码，会显示在按钮下方并支持点击复制；留空则该行自动隐藏 |
| `changelog` | 「查看历史版本与更新日志」的跳转地址 |

页面读取顺序：`version.json` → 若 `autoLatest` 为真再读取 GitHub 最新 Release 覆盖 → 都失败则使用 HTML 里写死的地址。**按钮不会因为配置出错而变成死链。**

> 安装包不再随站点仓库提交：`.gitignore` 已忽略 `downloads/` 与 `*.exe`，避免 65MB 文件在 git 历史中累积。

### 发布新版本（Release 为主渠道）

```bash
# 1. 软件仓库：改版本号 → 构建 → 打 tag → 发 Release，附件名用固定名
#    SteamCN-GameLauncher-Setup.exe（版本号、命名、tag、双附件等规则见本仓库 AGENTS.md）

# 2. 站点仓库：更新版本号（链接靠 autoLatest 自动跟随）
bash update-release.sh v2.6.2

# 若 Release 附件已改名为固定名 SteamCN-GameLauncher-Setup.exe，改用永久直链：
bash update-release.sh v2.6.2 --fixed

# 若仍用带版本号的文件名，把新版本的直链传进去，脚本会同时更新 version.json 和 index.html 兜底地址：
bash update-release.sh v2.6.2 https://github.com/<仓库>/releases/download/v2.6.2/xxx-v2.6.2-setup.exe

# 3. 推送上线
bash deploy.sh "更新到 v2.6.2"
```

`update-release.sh` 的用法：

| 命令 | 用途 |
|---|---|
| `bash update-release.sh v2.6.2 --auto` | **推荐**：按 `urlPattern` 用版本号自动拼出该版本直链（版本号出现两处也一起替换） |
| `bash update-release.sh v2.6.2` | 只改版本号与日期（Release 为主时通常够用） |
| `bash update-release.sh v2.6.2 --fixed` | 主下载切到固定名 latest 直链，以后版本不用再改 |
| `bash update-release.sh v2.6.2 <直链>` | 手动指定主下载直链，同步写入 version.json 与 index.html |
| `bash update-release.sh v2.6.2 <直链> <备用链接>` | 同时更新备用下载 |
| `bash update-release.sh v2.6.2 ./新包.exe` | 只更新 `downloads/` 本地备份（不提交） |

带版本号的文件名每次发版都会变，所以务必用上面的方式同步兜底地址，避免访问不到 api.github.com 的访客拿到旧版。

访客点主按钮时会拿到最新 Release 的 exe；`autoLatest` 生效时不改网页也能跟随新版本。

### 安装包命名规范

安装包**统一使用固定文件名**：

```
SteamCN-GameLauncher-Setup.exe
```

不含版本号。这样做的好处：

- 上传到 GitHub Release 后可使用永久有效的
  `releases/latest/download/SteamCN-GameLauncher-Setup.exe`，**更新版本不用改网页**
- 访客下载到的文件名干净，不会出现 `...v3.1.5-win-x64-setup.exe` 这种长串

如果暂时还用带版本号的附件名，页面上的 `autoLatest` 会自动读取最新 Release 的 exe 地址兜底，链接同样不会失效。

**推荐「双附件」**：同一个 Release 上传两份——版本化名（`...v2.6.2-win-x64-setup.exe`，便于归档核对）+ 固定名（`SteamCN-GameLauncher-Setup.exe`）。这样官网一次配置 `--fixed` 后永久有效，以后发版既不用改链接，也不用发链接给任何人。

---

## 改内容时注意

- **入口文件必须叫 `index.html`**，放在仓库根目录。
- **所有引用路径用相对路径**（如 `css/style.css`、`examples/md.html`），不要写成 `/css/style.css` 这类以斜杠开头的绝对路径，否则子目录部署时会 404。
- 改主题色只需改 `css/style.css` 顶部 `:root` 里的 `--accent`。
- 首页各区块里有 `<!-- 改这里 -->` 注释，搜索即可定位待替换文案。

---

## 回滚到历史版本

改坏了想退回之前的样子：

```bash
bash rollback.sh
```

脚本会列出最近 10 次提交（时间 + 说明），输入序号即可把站点文件恢复到当时的状态并自动发布。
回滚采用「生成一次新的反向提交」的方式，不改写 git 历史，随时可以再滚回来。

注意：回滚后，该版本之后**新增的文件不会自动消失**，如有多余文件需手动删除。

---页的性质

| 页面 | 性质 |
|---|---|
| `examples/md.html` | 真能用的功能：上传 Markdown / Word(.docx) / PDF，浏览器内解析并渲染成带目录的网页，文件不上传服务器 |
| `examples/vite.html` | 前端项目构建产物的展示，页面内的计数器与任务清单是真实交互 |
| `examples/ai.html` | 成品展示页，仅用于呈现「AI 生成并发布后的页面」长什么样，本身不含生成能力 |

在线实时生成页面需要后端与大模型接口，纯静态站点无法实现。

---

## 其他

- **开启 Pages**：仓库 Settings → Pages → Source 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → Save。
- **自定义域名**：在仓库根目录放一个 `CNAME` 文件（内容只有一行域名），并在域名服务商处添加 CNAME 记录指向 `clearlove0923.github.io`，生效后勾选 Enforce HTTPS。
- **国内访问**：`github.io` 在国内部分地区可能不稳定。若需要国内加速，可把同一套文件再部署到国内静态托管（文件全部使用相对路径，可直接整体上传）。
