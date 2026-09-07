# stuff-for-parent · 合适的工作

给父母在微信里打开的手机网页：查看匹配的家政/司机岗位，点进详情，可刷新。

## 微信打开（部署后）

## 微信里怎么打开（重要）

优先用正式站（已启用 GitHub Pages）：

https://sanseng33.github.io/stuff-for-parent/

若微信仍打不开国外域名，试国内镜像：

https://cdn.jsdmirror.com/gh/sanseng33/stuff-for-parent@gh-pages/index.html

仍不行：微信里点右上角 `···` → **在浏览器打开**。

不要用 `cdn.jsdelivr.net`（微信里常被拦）。


GitHub Pages 地址（需在仓库 Settings → Pages 启用一次）：

`https://sanseng33.github.io/stuff-for-parent/`

把链接发给父母即可。

## 本地预览

```bash
python3 -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/
```

## 自测

```bash
python3 scripts/selfcheck.py
```

## 更新岗位

编辑 `data/jobs.json` 后推送到 `main`。父母点页面上的「刷新」即可看到新数据。

## 说明

- 刷新读取的是整理好的 JSON，不是当场爬 Boss/58。
- 以后可迁到微信小程序，沿用同一份 `jobs.json`。
