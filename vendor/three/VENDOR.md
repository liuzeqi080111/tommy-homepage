# 第三方库来源与许可（site/vendor/three/）

本目录的三方库为**本地自托管**，供图库「3D 球体照片空间」使用（见 `site/gallery3d.js`）。
个人主页是纯静态站（无构建步骤、可 `file://` 直接打开），因此这里放的是 **UMD 经典脚本**，用
普通 `<script>` 引入，不使用 ESM / importmap。

## 文件清单

| 文件 | 字节 | SHA-256 | 说明 |
| --- | --- | --- | --- |
| `three.min.js` | 607784 | `f34446bf875b5fb0dcd93819ffe1d9e182d46634ee855f5d904c6c4ac7cdbc95` | three.js r147 UMD 构建，暴露全局 `THREE`（`THREE.REVISION === '147'`） |
| `CSS3DRenderer.js` | 6962 | `257b453b226663bd12475f2da6c232053e2baf653a959859be042e1d39f636fe` | three.js r147 `examples/js/renderers/CSS3DRenderer.js`，非模块版，直接给 `THREE.CSS3DRenderer` / `THREE.CSS3DObject` 挂类 |
| `LICENSE` | 1081 | `fbf3943930dacbf56aabb8dc5d816440bd16aa6f4cc78ddbdf12106ee1807832` | three.js 的 MIT 许可证原文（"Copyright © 2010-2022 three.js authors"） |

## 版本选择理由

three.js 从 **r148** 起删除了 `examples/js/`（非模块版渲染器），只保留 `examples/jsm/`。
本站在 r147 与 r148 之间实测：

| 版本 | UMD 构建 | `examples/js/.../CSS3DRenderer.js` |
| --- | --- | --- |
| 0.146.x | 有 | 有 |
| **0.147.0（采用）** | **有** | **有（最后一个同时具备两者的版本）** |
| 0.148.0 ~ 0.150.x | 有 | 已删除 |

选 r147 的原因：站点无构建链路，用经典脚本可以双击 `site/index.html` 直接跑（`file://` 下无
ESM 跨域限制），也不需要 importmap；同时 UMD 版本的 `three.min.js` 体积远小于 ESM 包
（607KB vs 670KB+，且无需再配 `examples/jsm` 的模块解析）。

## 许可与合规

- three.js 采用 **MIT 许可证**，允许商业/非商业使用、修改与再分发，要求在副本中保留版权声明与
  许可声明 —— 本目录已随附 `LICENSE` 原文，未做删改。
- 三个文件**均为原样下载，未做任何修改**（未压缩混淆、未注入、未裁剪）。上文 SHA-256 可用于
  校验字节一致。
- 页面署名：图库内的 3D 引擎仅作为渲染库使用，署名信息保留在本文件与 `LICENSE` 中。

## 降级策略

`site/gallery3d.js` 在挂载前检查 `window.THREE && THREE.CSS3DRenderer && THREE.CSS3DObject`，
任一缺失或初始化抛错时返回 `false`，图库回落到原有的二维星空布局（`site/gallery.js` 原有逻辑
完全保留）。因此即使本目录缺失，站点功能不缺失、只少了 3D 观感。
