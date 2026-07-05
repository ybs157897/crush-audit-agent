# Crush Desktop (Electron)

Electron 桌面壳，加载 `web/` 前端并与本地 Crush API 通信。

## 架构

```
Crush API (:7600)  ←── Vite 代理 /v1 ──  Web UI (:3000)  ←── Electron 窗口
```

## 开发

```powershell
# 一键启动 API + Web + Electron
.\scripts\start-gui.ps1
```

或手动：

```powershell
# 1. 启动 API
.\crush.exe server -H tcp://127.0.0.1:7600

# 2. 启动 Web（另一个终端）
cd web
npm run dev

# 3. 启动 Electron（另一个终端）
cd desktop
npm install
npm run dev
```

## 打包

```powershell
cd desktop
npm install
npm run dist
```

产物在 `desktop/release/`。打包版内置静态文件服务器，并代理 `/v1` 到 `127.0.0.1:7600`。

## 环境变量


| 变量               | 默认                      | 说明                 |
| ---------------- | ----------------------- | ------------------ |
| `CRUSH_WEB_URL`  | `http://localhost:3000` | 开发模式加载地址           |
| `CRUSH_WEB_PORT` | `3000`                  | Web 端口             |
| `CRUSH_API_PORT` | `7600`                  | Crush API 端口       |
| `CRUSH_DEVTOOLS` | -                       | 设为 `1` 打开 DevTools |


