# CodeSnap for XCPC Workstation

基于原版 [kufii/CodeSnap](https://github.com/kufii/CodeSnap) 视觉风格打造的 **XCPC Workstation** 代码截图插件。

## 特性

- **原版 CodeSnap 质感**：默认采用 `#abb8c3` 冷静灰蓝底板、`rgba(0, 0, 0, 0.55) 0px 20px 68px` 深邃柔和阴影、`3em` 容器留白、macOS 红黄绿窗口圆点、可选居中窗口标题与标志性 Nord 光圈快门按钮。
- **硬件加速 Canvas2D 实时绘制**：纯 Web `<WebView>` 本地渲染，参数调节零延迟、零网络请求、零敏感权限。
- **轻量多语言高亮**：内置 `highlight.js` 精选语言（C++、C、Python、Rust、Java、Go、JavaScript、TypeScript、Bash、JSON、TOML、Diff、纯文本），并内置多套暗/亮经典配色主题。
- **灵活导出与配置记忆**：支持 `1x / 2x / 3x` 高清倍率、一键复制图片到剪贴板（`window.xcpc.clipboard.writeImage`）与保存 PNG（`window.xcpc.files.savePng`），并自动记住上次配置。

## 开发与打包

```bash
npm install
npm run typecheck
npm run build
xcpc plugin link ./dist
xcpc plugin check ./dist
xcpc plugin pack ./dist
```
