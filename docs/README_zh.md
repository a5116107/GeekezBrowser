# GeekEZ Browser

<div align="center">

<img src="../icon.png" width="100" height="100" alt="GeekEZ Logo">

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

**面向电商与多账号运营场景的指纹隔离浏览器。**

[English](../README.md) | [下载发布版](https://github.com/EchoHS/GeekezBrowser/releases)

</div>

---

## 项目简介

**GeekEZ Browser** 基于 **Electron** 与 **Puppeteer** 构建，集成 **Xray-core** 作为网络与代理能力底座。

项目聚焦于多账号环境隔离、代理一致性与自动化管理，适用于 Amazon、TikTok、Facebook、Shopee 等跨平台运营场景。

## 界面截图

<div align="center">

<img src="Main Interface1.png" alt="主界面 1" width="800">
<img src="Main Interface2.png" alt="主界面 2" width="800">

*主界面 - 环境管理*

</div>

## 核心能力

### 指纹隔离
- 环境级硬件参数随机化（CPU 核心数、内存）。
- 时区与地理位置支持自动匹配与手动配置。
- 语言配置支持浏览器层与请求头层对齐。
- WebRTC 泄漏保护策略。

### 网络引擎（Xray-core）
- 支持 VMess、VLESS、Trojan、Shadowsocks、Socks5、HTTP 等协议。
- 支持 REALITY、XHTTP、gRPC、mKCP、WebSocket、H2 等传输形态。
- 支持前置代理链路（本地 -> 前置代理 -> 目标节点 -> 网站）。
- 兼容 IPv4 / IPv6 场景。

### 管理与运维
- 支持导入 Chrome 扩展到隔离环境。
- 支持标签化环境管理。
- 支持动态水印标识当前环境。
- 支持多环境并行启动。
- 支持可选本地 REST API（`/api/*`）用于自动化接入。

## Cookie API（高级功能）

鉴权请求头：

- `X-GeekEZ-API-Token`

主要接口：

- `GET /api/profiles/:idOrName/cookies/sites`
- `GET /api/profiles/:idOrName/cookies?site=example.com`
- `POST /api/profiles/:idOrName/cookies`
- `POST /api/profiles/:idOrName/cookies/delete`
- `POST /api/profiles/:idOrName/cookies/clear`
- `GET /api/profiles/:idOrName/cookies/export?site=example.com`
- `POST /api/profiles/:idOrName/cookies/import`（`mode=merge|replace`）

参考资料：

- 示例文档：`docs/API_COOKIE_EXAMPLES.md`
- Postman 集合：`docs/postman/GeekEZ_Cookie_API.postman_collection.json`
- Postman 环境模板：`docs/postman/GeekEZ_Local.postman_environment.json`
- Postman 说明：`docs/postman/README.md`
- 冒烟命令：`npm run smoke:cookie-api`、`npm run smoke:cookie-api:newman`

## 订阅 URL 安全策略

默认情况下，订阅拉取会阻止 `localhost` 与私网地址，并逐跳校验重定向链路。

若确需内网订阅源，可在以下位置配置白名单：

- 设置 -> 开发者功能 -> `subscriptionPrivateAllowlist`
- 示例：`127.0.0.1`、`*.localhost`、`intranet.example.com`

## 快速开始

### 方式一：下载发布版（推荐）

前往 [Releases](https://github.com/EchoHS/GeekezBrowser/releases) 下载：

- Windows：`GeekEZ Browser-{version}-win-x64.exe`
- macOS ARM64：`GeekEZ Browser-{version}-mac-arm64.dmg`
- macOS Intel：`GeekEZ Browser-{version}-mac-x64.dmg`
- Linux：`GeekEZ Browser-{version}-linux-x64.AppImage`

### 方式二：源码运行

前置依赖：

- Node.js（v16+）
- Git

```bash
git clone https://github.com/EchoHS/GeekezBrowser.git
cd GeekezBrowser
npm install
npm start
```

## 打包构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 回归测试（无 GUI）

```bash
npm run regression:ipc
npm run regression:i18n
npm run regression:all
```

## 使用建议

1. 敏感站点建议使用时区自动匹配。
2. 地理位置配置应与代理出口尽量一致。
3. 仅在需要外部自动化时启用远程调试端口。

## 常见问题

### macOS 提示“应用已损坏”或“无法打开”

1. 将 `GeekEZ Browser` 拖入 **Applications**。
2. 执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/GeekEZ\ Browser.app
```

3. 重新打开应用。

## 免责声明

本项目仅用于学习与研究。请在使用时遵守目标平台服务条款与相关法律法规，风险由使用者自行承担。

## 许可证

本项目使用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可证。

## 社区

- QQ 群：`1079216892`
