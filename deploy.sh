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

git add -A
if git diff --cached --quiet; then
  echo "没有需要发布的改动，跳过提交"
else
  MSG="${1:-deploy: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$MSG"
fi

git push -u origin main
echo "已推送。1-2 分钟后 Pages 自动更新，访问你的 github.io 网址即可查看。"
