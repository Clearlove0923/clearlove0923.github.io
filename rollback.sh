#!/usr/bin/env bash
# rollback.sh
# 作用：把站点文件恢复到某一次历史提交的样子，并重新发布
#
# 用法： bash rollback.sh
# 脚本会列出最近 10 次提交，输入序号即可回退。
# 说明：采用「生成一次新的反向提交」的方式，不改写 git 历史，
#       随时可以再回滚回来，也不会影响其他人。

set -e
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "当前目录不是 git 仓库，无法回滚"
  exit 1
fi

echo "最近的提交记录（1 为最新）："
echo "---------------------------------------------"
git log --pretty=format:"%h  %ad  %s" --date=short -n 10 | cat -n
echo ""
echo "---------------------------------------------"

printf "输入要回退到的序号（直接回车取消）： "
read -r N

if [ -z "$N" ]; then
  echo "已取消"
  exit 0
fi

SHA=$(git log --pretty=format:"%h" -n 10 | sed -n "${N}p")

if [ -z "$SHA" ]; then
  echo "序号无效"
  exit 1
fi

echo ""
echo "将把站点文件恢复到："
git log -1 --pretty="  %h  %ad  %s" --date=short "$SHA"
echo ""
printf "确认继续？输入 y 回车： "
read -r Y

if [ "$Y" != "y" ]; then
  echo "已取消"
  exit 0
fi

git checkout "$SHA" -- .
echo ""
echo "文件已恢复。注意：该版本之后新增的文件不会被自动删除，如有多余文件请手动清理。"
bash deploy.sh "回退到 $SHA"
