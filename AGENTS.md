# AGENTS.md

> 本文件是 **AI 助手（WorkBuddy）在本仓库中的协作与操作约束**。
> 仓库用途：`clearlove0923.github.io` —— SteamCN-GameLauncher 的产品展示与下载官网，纯静态站点，托管在 GitHub Pages。
> 软件源码仓库另有其处，**发布流程与版本规则统一以本文件为准**，不在两边各写一份，避免规则分散冲突。

最后更新：2026-10-09 · 适用于 v3.1.6 及之后的所有维护工作

---

## 1. 环境与路径

| 项目 | 值 |
|---|---|
| 站点仓库本地路径 | `F:\my-site` |
| 远端地址 | `https://github.com/Clearlove0923/clearlove0923.github.io.git` |
| 默认分支 | `main` |
| 线上地址 | `https://clearlove0923.github.io/` |
| 软件源码仓库 | `F:\zzy_work_space\SteamCN-GameLauncher`（远端 `Violet0923/SteamCN-GameLauncher`） |
| Release 发布仓库 | `Clearlove0923/SteamCN-GameLauncher`（当前对外分发用） |
| git 可执行文件 | `F:\Git\cmd\git.exe` |

### 工具环境限制（必须知道）

1. **AI 可按用户明确要求推送**：用户明确要求提交并推送时，AI 可在核对工作区、目标分支与远端地址后执行普通 `git push`。若网络或 TLS 失败，应保留本地提交并把可直接执行的推送命令交给用户。
2. **Bash 工具缺少 coreutils**：`ls` / `mkdir` / `head` 等不可用；`sed --version` 无输出。创建目录、写文件改用 Write/Edit/Glob；需要 shell 能力时用 PowerShell 调用 `F:\Git\cmd\git.exe` 或 bash 的绝对路径。
3. **PowerShell 输出不回显**：需要查看命令结果时，把输出写入临时文件（如 `_gs.txt`）再读取，用完立即删除。

---

## 2. 称呼与隐私

1. 用户称呼为 **白黎**，正文与提交说明均不使用系统账户名。
2. 仓库内的文档、注释、配置文件中**禁止出现**：
   - Windows 系统账户路径（如 `C:\Users\...`）
   - 个人邮箱、token、密码、访问密钥
   - 任何未公开的第三方凭据
3. 公开页面文案需**中性化**：技术原理照写，但避免「伪造」「偷跑」「白嫖」「欺骗」等刺激性措辞（改用「生成安装记录」「运行」「复用」等）。
4. 昵称、账号名（如 `ZZY-MAX-09`、`clearlove0923.github.io`）属于公开信息，可正常出现。

---

## 3. 站点结构

```
F:\my-site\
├─ index.html                 首页（落地页，含下载区 #download）
├─ features.html              功能展示
├─ tutorial.html              使用教程
├─ docs.html                  文档（系统要求 / 一键更新 / AppID 自动填充 / 已知限制）
├─ about.html                 关于此软件
├─ 404.html                   404 页（GitHub Pages 自动使用）
├─ docs/learning-guide.html   学习与二次开发指南（由 LEARNING_GUIDE.md 转换）
├─ examples/md.html           文档转网页（真功能，支持 .md/.docx/.pdf）
├─ examples/vite.html         Vite + React 构建产物示例（展示用）
├─ examples/ai.html           AI 生成页面示例（展示用）
├─ css/style.css              全站样式（主题色改 :root 的 --accent）
├─ assets/hero-bg.jpg         首页背景图
├─ assets/favicon.svg         站点图标
├─ version.json               下载区唯一配置源
├─ deploy.sh                  一键发布（git add/commit/push）
├─ update-release.sh          更新版本号与下载链接
├─ rollback.sh                一键回滚到历史提交
├─ robots.txt / sitemap.xml   SEO
├─ downloads/                 安装包本地备份（已 gitignore，不提交）
└─ README.md                  站点维护说明
```

---

## 4. 改动原则

1. **先读后改**：修改任何文件前先读取现有内容，禁止凭记忆整篇覆写。
2. **最小改动**：能改一行解决的，不重写整个文件；不调整与本任务无关的样式和结构。
3. **不删除用户文件**：清理时优先询问；确需删除临时文件（自己创建的 `_*.txt`、`_check.js` 等）要及时清掉。
4. **入口与路径**：入口文件必须是 `index.html`；所有引用使用**相对路径**（`css/style.css`），禁止以 `/` 开头的绝对路径（子路径部署会 404）。
5. **禁止 force push**，禁止改写已推送的历史。
6. **不提交** `downloads/`、`*.exe`、`.deploy-repo`、`.workbuddy/`、临时检查文件。
7. 新增页面必须：引用 `css/style.css` 与 favicon、加入导航互链、同步更新 `sitemap.xml`。

---

## 5. 提交与推送

### 提交信息前缀

| 前缀 | 用途 |
|---|---|
| `feat:` | 新页面、新功能 |
| `fix:` | 修复链接、样式、脚本问题 |
| `docs:` | 文档与说明 |
| `chore:` | 配置、依赖、脚本调整 |

### 发布命令

```bash
cd /f/my-site
bash deploy.sh "本次改动的说明"    # git add -A + commit + push，一条命令上线
```

回滚：

```bash
bash rollback.sh                  # 列出最近 10 次提交，输入序号即恢复并发布
```

推送后 GitHub Pages 约 1~2 分钟生效。默认只做到本地提交；用户明确要求推送时，AI 可在确认远端和分支后执行普通 push。

---

## 6. 下载区规则（version.json 单一来源）

**不要直接改 HTML 里的下载链接**，一切以 `version.json` 为准：

```json
{
  "version": "v3.1.5",
  "date": "2026-09-30",
  "size": "133 MB",
  "repo": "Clearlove0923/SteamCN-GameLauncher",
  "autoLatest": true,
  "urlPattern": "https://github.com/{repo}/releases/download/{ver}/SteamCN-GameLauncher-{ver}-win-x64-setup.exe",
  "windows": { "label": "下载安装包（133 MB）", "url": "..." },
  "mirror":  { "label": "备用下载（国内加速）", "url": "https://...", "pwd": "" },
  "changelog": "https://github.com/Clearlove0923/SteamCN-GameLauncher/releases"
}
```

| 字段 | 说明 |
|---|---|
| `windows.url` | 主下载按钮兜底地址，填当前版本的 Release 直链 |
| `repo` / `autoLatest` | `true` 时页面读取该仓库最新 Release 覆盖按钮链接与版本号 |
| `urlPattern` | 版本化直链模板，`{ver}` 换版本号、`{repo}` 换仓库，供 `--auto` 使用 |
| `mirror.url` / `mirror.pwd` | 备用下载与提取码；`pwd` 留空则该行自动隐藏 |
| `changelog` | 「查看历史版本与更新日志」跳转地址 |

页面取值顺序：`version.json` →（autoLatest）GitHub 最新 Release → HTML 写死地址。**任何一环都不能让按钮变成死链。**

---

## 7. 发布新版本流程

### 分发渠道（现阶段以 Release 为主）

| 渠道 | 角色 |
|---|---|
| GitHub Release（`Clearlove0923/SteamCN-GameLauncher`） | **主**：版本记录与下载的唯一权威来源 |
| 官网主按钮 | 展示与跳转，指向 Release 直链 |
| 网盘（蓝奏云等） | 国内加速备用，失效不阻塞发布 |

### 安装包命名

1. 对外分发统一使用固定名 `SteamCN-GameLauncher-Setup.exe`，禁止空格、中文。
2. 需要保留版本化归档名时，采用**双附件**：同一 Release 同时上传
   - `SteamCN-GameLauncher-Setup.exe`（固定名，供永久 `latest` 直链）
   - `SteamCN-GameLauncher-vX.Y.Z-win-x64-setup.exe`（版本化名，归档用）
3. 固定名附件必须存在于**最新** Release 中，否则 `latest` 直链 404。

### 版本号

语义化三段式：功能更新 +0.1，修复 +0.01，破坏性变更 +1.0.0；tag 带 `v` 前缀。软件侧四处版本号（version.json / csproj / AppInfo / appxmanifest）必须一致。

### 官网同步（本仓库要做的事）

```bash
# 附件仍带版本号（现状）：按模板自动拼直链，推荐
bash update-release.sh v2.6.3 --auto

# 附件已改为固定名：切到永久 latest 直链，只需做一次
bash update-release.sh v2.6.3 --fixed
# 之后每次只更新版本号与日期
bash update-release.sh v2.6.4

# 推送上线
bash deploy.sh "更新到 v2.6.3"
```

`update-release.sh` 会同时更新 `version.json` 与 `index.html` 中的兜底地址——**这一步不能省**，否则连不上 `api.github.com` 的国内访客会拿到旧版。

---

## 8. 文档写作

1. 新增 Markdown 文档如需公开分享，转换为网页放在 `docs/` 或 `examples/`，并在首页/文档页加入口。
2. 转换时保留原有技术细节，同时按第 2 节做措辞中性化。
3. `examples/md.html` 支持 `.md` / `.docx` / `.pdf` 浏览器内解析，纯前端运行，文件不上传服务器；新增格式支持时同步更新首页示例卡文案。

---

## 9. 禁止事项

1. 禁止把 65MB 安装包提交进 git（`downloads/` 与 `*.exe` 已在 `.gitignore`）。
2. 禁止在 HTML 里写死与 `version.json` 不一致的下载链接。
3. 禁止使用绝对路径引用站内资源。
4. 禁止 force push 或改写已推送历史。
5. 禁止在仓库文件中出现系统账户路径、邮箱、token。
6. 禁止直接覆写未读取过的文件。
7. 未经用户明确要求，禁止在 AI 侧执行 `git push`；已获明确要求时仅允许普通 push，仍禁止 force push 与改写历史。
8. 禁止删除用户提供的素材（背景图、安装包、文档原文）。

---

## 10. 自检清单

### 每次交付前

- [ ] 改动的文件都已实际读取过，未凭记忆整篇覆写
- [ ] 页面引用均为相对路径，新增页面已加导航与 sitemap
- [ ] 首页脚本语法通过检查（提取 `<script>` 内容用 `node --check` 验证）
- [ ] 临时文件（`_*.txt`、`_check.js` 等）已清理
- [ ] 未涉及下载区时，`version.json` 与 `index.html` 兜底地址保持一致
- [ ] 文案中无系统账户路径、邮箱、token，措辞中性

### 每次发布版本前

- [ ] 版本号符合语义化规则
- [ ] Release 附件名符合第 7 节命名要求（固定名已上传）
- [ ] `latest` 直链返回 200 而非 404
- [ ] 已执行 `update-release.sh`（`--auto` 或 `--fixed`）
- [ ] 官网显示的版本号、日期与 Release 一致
- [ ] 用手机流量实测主下载按钮可正常下载
