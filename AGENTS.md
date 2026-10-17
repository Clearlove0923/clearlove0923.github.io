# AGENTS.md
> 仓库用途：`clearlove0923.github.io` —— SteamCN-GameLauncher 的产品展示与下载官网，纯静态站点，托管在 GitHub Pages。
> 软件源码仓库另有其处，**发布流程与版本规则统一以本文件为准**，不在两边各写一份，避免规则分散冲突。
https://github.com/Clearlove0923/SteamCN-GameLauncher/blob/master/docs/GameSpecialSetting.md
---

## 1. 环境与路径

| 项目 | 值 |
|---|---|
| 远端地址 | `https://github.com/Clearlove0923/clearlove0923.github.io.git` |
| 默认分支 | `main` |
| 线上地址 | `https://clearlove0923.github.io/` |
| 软件源码仓库 | `https://github.com/Clearlove0923/SteamCN-GameLauncher`|
| 游戏桥接程序仓库 | `https://github.com/Clearlove0923/GameLaunchBridges`（个别游戏所需的桥接 EXE） |



### 工具环境限制


---

## 2. 称呼与隐私
1. 不主动使用未经用户确认的称呼，正文与提交说明均不使用系统账户名。
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
├─ game-guide.html            游戏适配与特殊启动设置
├─ tutorial.html              使用教程
├─ docs.html                  文档（系统要求 / 一键更新 / AppID 自动填充 / 已知限制）
├─ about.html                 关于此软件
├─ 404.html                   404 页（GitHub Pages 自动使用）
├─ docs/learning-guide.html   学习与二次开发指南（由 LEARNING_GUIDE.md 转换）
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
| GitHub Release`https://github.com/Clearlove0923/SteamCN-GameLauncher/releases` | 
| CNB Release`https://cnb.cool/SteamCN-GameLauncher/SteamCN-GameLauncher/-/releases` | 
| 官网主按钮 | 展示与跳转，指向 Release 直链，优先引导用户从CNB下载 |

### 安装包命名
每次桥接器更新，或者软件版本更新时，需要同步更新官网安装包下载连接
### 版本号

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

1. 新增 Markdown 文档如需公开分享，转换为网页放在 `docs/`，并在首页或文档页加入口。
2. 转换时保留原有技术细节，同时按第 2 节做措辞中性化。
3. 官网只保留与 SteamCN-GameLauncher 直接相关的产品、使用、适配与开发内容，不新增通用前端演示或文档转换工具。

### 游戏桥接程序

1. `Clearlove0923/GameLaunchBridges` 是个别游戏所需桥接 EXE 的源码与发布仓库；`Clearlove0923/SteamCN-GameLauncher` 是主程序源码及 Release 发布仓库，二者用途不可混淆。
2. 桥接程序只在 `game-guide.html` 的对应游戏条目中说明，不放入官网主程序下载区，也不提交 EXE 到本站仓库。
3. 每个已发布的桥接程序应提供当前版本已实际发布的 CNB 与 GitHub Release 链接；未发布的渠道必须明确标注，不能生成失效下载链接。并写明原始文件名、放置位置、在软件游戏配置界面选择该桥接 EXE 作为可执行文件的步骤，以及首次运行前置条件；桥接 EXE 下载后无需重命名。
4. 桥接程序更新后，应以 `GameLaunchBridges` 仓库 README 和 Releases 为准，同步版本号、文件名、使用办法与验证状态；不能使用仓库级 `releases/latest` 代替单个游戏的版本链接，因为不同游戏独立发布。

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
