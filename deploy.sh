#!/usr/bin/env bash
# 一键发布脚本：把当前目录内容推送到 GitHub 仓库，触发 Pages 自动更新
# 用法：bash deploy.sh "可选的提交说明"
set -e
cd "$(dirname "$0")"

REPO_URL_FILE=".deploy-repo"

if [ ! -d .git ]; then
  if [ -f "$REPO_URL_FILE" ]; then
    REPO=$(cat "$REPO_URL_FILE")
  else
    printf "首次部署，请粘贴你的 GitHub 仓库地址\n(形如 https://github.com/用户名/用户名.github.io.git): "
    read -r REPO
    echo "$REPO" > "$REPO_URL_FILE"
  fi
  git init
  git branch -M main
  git remote add origin "$REPO"
  echo "已初始化仓库并绑定: $REPO"
fi

# ---------- 自动缓存戳 ----------
# 页面里写的是 css/style.css?v=__BUILD__，这里统一换成部署时间戳。
# 每次部署资源地址都会变，浏览器和加速节点就不会继续使用旧 CSS，
# 以后改完样式或脚本就不用每次手动 Ctrl+Shift+R 了。
BUILD_STAMP=$(date +%Y%m%d%H%M%S)
PAGES="index.html 404.html about.html docs.html features.html game-guide.html tutorial.html docs/learning-guide.html"
for f in $PAGES; do
  [ -f "$f" ] || continue
  sed -i -E 's#css/style\.css\?v=[^"]*#css/style.css?v='"$BUILD_STAMP"'#g' "$f"
done
echo "静态资源缓存戳：$BUILD_STAMP"

git add -A
if git diff --cached --quiet; then
  echo "没有需要发布的改动，跳过提交"
else
  MSG="${1:-deploy: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$MSG"
fi
git push -u origin main
echo "已推送（资源缓存戳：$BUILD_STAMP）。"
echo "1-2 分钟后 Pages 构建完成。"
echo "提示：HTML 本身在 GitHub 那边有约 10 分钟缓存，本次验证建议按一次 Ctrl+Shift+R；"
echo "      之后因为资源地址带了新缓存戳，刷新就能看到最新样式，不用再强刷。"
