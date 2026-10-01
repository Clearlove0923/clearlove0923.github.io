#!/usr/bin/env bash
# update-release.sh
# 发布新版本：更新版本号、日期，并同步主下载直链（version.json + index.html 兜底地址）
#
# 用法（Release 为主分发渠道）：
#   bash update-release.sh v3.1.6                       只更新版本号与日期（链接靠 autoLatest 自动跟随）
#   bash update-release.sh v3.1.6 --auto                按 version.json 的 urlPattern 拼装该版本的直链（推荐）
#   bash update-release.sh v3.1.6 --fixed               主下载改为固定名 latest 直链（需 Release 附件已改名为固定名）
#   bash update-release.sh v3.1.6 https://直链.exe      手动指定主下载直链
#   bash update-release.sh v3.1.6 https://直链.exe https://备用链接   同时更新备用下载
#   bash update-release.sh v3.1.6 ./新包.exe [https://备用链接]       只更新本地备份（downloads/ 已被 .gitignore 忽略）
#
# 说明：
#   - 文件名带版本号时，每次发版链接都会变，所以本脚本会同时改 version.json 和 index.html 里写死的兜底地址，
#     保证访问不到 api.github.com 的访客也能拿到当前版本。
#   - 同时会把 index.html 的「当前版本 vX.Y.Z」文案一起改掉。
#   - 安装包体积变化时，需要手动更新 version.json 与 index.html 里的「下载安装包（xx MB）」文案。
#   - Release 附件改名为 SteamCN-GameLauncher-Setup.exe 后用 --fixed，链接永久不变，以后只改版本号即可。

set -e
cd "$(dirname "$0")"

VER="$1"
ARG2="$2"
ARG3="$3"

# 版本号统一带 v 前缀（允许传 3.1.5 这种写法）
case "$VER" in
  ""|v*) ;;
  *) VER="v$VER" ;;
esac

FILE="version.json"
PAGE="index.html"
FIXED_NAME="SteamCN-GameLauncher-Setup.exe"
DOWNLOAD_DIR="downloads"

if [ -z "$VER" ]; then
  echo "用法: bash update-release.sh <版本号> [--auto | --fixed | 主下载直链 | 新安装包路径] [备用下载链接]"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "找不到 $FILE，请在站点根目录运行本脚本"
  exit 1
fi

REPO=$(grep -m1 '"repo"' "$FILE" | sed -E 's/.*"repo"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
if [ -z "$REPO" ]; then
  echo "version.json 缺少 repo 字段，无法拼装 latest 直链"
  exit 1
fi

MAIN_URL=""
MIRROR=""

if [ -n "$ARG2" ]; then
  case "$ARG2" in
    --fixed|--latest|-f)
      MAIN_URL="https://github.com/$REPO/releases/latest/download/$FIXED_NAME"
      echo "主下载改为固定名直链：$MAIN_URL"
      echo "（请确认该 Release 的附件名已是 $FIXED_NAME，否则链接会 404）"
      ;;
    --auto|-a)
      PATTERN=$(grep -m1 '"urlPattern"' "$FILE" | sed -E 's/.*"urlPattern"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
      if [ -z "$PATTERN" ]; then
        echo "version.json 缺少 urlPattern 字段，无法拼装版本号直链"
        exit 1
      fi
      MAIN_URL=$(printf '%s' "$PATTERN" | sed "s|{ver}|$VER|g; s|{repo}|$REPO|g")
      echo "按模板拼装主下载直链：$MAIN_URL"
      ;;
    http*)
      MAIN_URL="$ARG2"
      ;;
    *)
      if [ ! -f "$ARG2" ]; then
        echo "找不到安装包：$ARG2"
        exit 1
      fi
      mkdir -p "$DOWNLOAD_DIR"
      cp "$ARG2" "$DOWNLOAD_DIR/$FIXED_NAME"
      echo "本地备份已更新：$DOWNLOAD_DIR/$FIXED_NAME（该目录已被 .gitignore 忽略，不会提交）"
      ;;
  esac
fi

if [ -z "$MIRROR" ] && [ -n "$ARG3" ]; then
  case "$ARG3" in
    http*) MIRROR="$ARG3" ;;
  esac
fi

TODAY=$(date +%F)

sed -i "s|\"version\": \".*\"|\"version\": \"$VER\"|" "$FILE"
sed -i "s|\"date\": \".*\"|\"date\": \"$TODAY\"|" "$FILE"

if [ -n "$MAIN_URL" ]; then
  # 第一处 url 是主下载（windows）
  LINE=$(grep -n '"url"' "$FILE" | sed -n '1p' | cut -d: -f1)
  [ -n "$LINE" ] && sed -i "${LINE}s|\"url\": \".*\"|\"url\": \"$MAIN_URL\"|" "$FILE"
  # 同步 index.html 里写死的兜底地址
  if [ -f "$PAGE" ]; then
    sed -i "/id=\"downloadBtn\"/{n;s|href=\".*\"|href=\"$MAIN_URL\"|}" "$PAGE"
    echo "已同步 $PAGE 中的兜底地址"
  fi
fi

# 同步 index.html 里写死的版本号文案（无论有没有指定直链都要改，否则断网访客看到旧版本号）
if [ -f "$PAGE" ]; then
  sed -i "s|当前版本 v[0-9][0-9.]*|当前版本 $VER|" "$PAGE"
  echo "已同步 $PAGE 中的版本文案：当前版本 $VER"
fi

if [ -n "$MIRROR" ]; then
  # 第二处 url 是备用下载（mirror）
  LINE=$(grep -n '"url"' "$FILE" | sed -n '2p' | cut -d: -f1)
  [ -n "$LINE" ] && sed -i "${LINE}s|\"url\": \".*\"|\"url\": \"$MIRROR\"|" "$FILE"
fi

echo ""
echo "$FILE 当前内容："
grep -E '"version"|"date"|"url"|"repo"' "$FILE"
echo ""

if [ -z "$MAIN_URL" ]; then
  echo "提示：未指定主下载直链，兜底地址仍是上一版；autoLatest 正常情况下会自动跟随最新版，"
  echo "      但访问不到 api.github.com 的访客会拿到旧版。如 Release 附件已改为固定名，下次用："
  echo "      bash update-release.sh $VER --fixed"
  echo ""
fi

echo "提示：安装包体积若变化，请同步更新 $FILE 与 $PAGE 里的「下载安装包（xx MB）」文案。"
echo ""
echo "确认无误后执行：  bash deploy.sh \"更新到 $VER\""
