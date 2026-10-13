# 全量本地文字实施计划

**Goal:** 将现有文字全部打包并支持断网浏览。

**Architecture:** starter_data 构建完整文字包；ContentBuffer 的 localOnly 模式仅从 seedBank 补充；Service Worker 缓存项目范围内的运行文件。

**Tech Stack:** Python、原生 JavaScript、Cache API、Playwright 浏览器验证。

- [x] 修改 starter_data.py：默认选择全部文字，生成 localTextOnly 和资源散列版本的 offline-worker.js；现有显式剔除和歌曲选择保留。
- [x] 修改 content-buffer.js 与 index.html：文字传入 localOnly，不调用文字 API，保留随机、历史及缓冲；全部展示后提示读完。
- [x] 添加 offline-worker.template.js：安装缓存 index.html、starter-content.js、content-buffer.js，作用域相对路径，缓存优先，编辑器与 API 不介入；注册仅在 HTTP(S) 安全上下文。
- [x] 用隔离的本地测试服务验证三类文字完全取完、无重复、无网络补充、断网重载、子目录、喜欢保留与 HTML 文件入口。
- [x] 更新 README、用户说明、单文件和 ZIP；检查语法、diff 和归档完整性，提交本地分支。

验证结果：24 项全量离线检查及 38 项原功能回归检查全部通过；ZIP 29 个条目完整，尚未发布。
