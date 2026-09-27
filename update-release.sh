#!/usr/bin/env bash
# update-release.sh
# 发布新版本：更新版本号、日期，并同步主下载直链（version.json + index.html 兜底地址）
#
# 用法（Release 为主分发渠道）：
#   bash update-release.sh v2.6.2                       只更新版本号与日期（链接靠 autoLatest 自动跟随）
#   bash update-release.sh v2.6.2 --auto                按 version.json 的 urlPattern 拼装该版本的直链（推荐）
#   bash update-release.sh v2.6.2 --fixed               主下载改为固定名 latest 直链（需 Release 附件已改名为固定名）
#   bash update-release.sh v2.6.2 https://直链.exe      手动指定主下载直链
#   bash update-release.sh v2.6.2 https://直链.exe https://备用链接   同时更新备用下载
#   bash update-release.sh v2.6.2 ./新包.exe [https://备用链接]       只更新本地备份（downloads/ 已被 .gitignore 忽略）
#
# 说明：
#   - 文件名带版本号时，每次发版链接都会变，所以本脚本会同时改 version.json 和 index.html 里写死的兜底地址，
#     保证访问不到 api.github.com 的访客也能拿到当前版本。
#   - Release 附件改名为 SteamCN-GameLauncher-Setup.exe 后用 --fixed，链接永久不变，以后只改版本号即可。

set -e
cd "$(dirname "$0")"

VER="$1"
ARG2="$2"
ARG3="$3"
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

echo "确认无误后执行：  bash deploy.sh \"更新到 $VER\""
