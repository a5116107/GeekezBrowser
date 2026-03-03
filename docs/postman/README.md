# Postman 使用说明（Cookie API）

本目录包含 GeekEZ Cookie API 的 Postman 资产：

- Collection：`GeekEZ_Cookie_API.postman_collection.json`
- Environment：`GeekEZ_Local.postman_environment.json`

---

## 1. 导入文件

在 Postman 中依次导入：

1. `docs/postman/GeekEZ_Cookie_API.postman_collection.json`
2. `docs/postman/GeekEZ_Local.postman_environment.json`

然后在右上角环境切换为 **GeekEZ Local**。

---

## 2. 配置变量

至少需要配置以下变量：

- `baseUrl`：默认 `http://localhost:12138`
- `apiToken`：来自 GeekEZ 设置页 API Token
- `profileIdOrName`：目标环境 ID 或名称
- `site`：测试站点域名（例如 `example.com`）

---

## 3. 推荐调试顺序

建议按以下顺序执行请求：

1. `Cookie Sites Summary`
2. `List Cookies (All)` 或 `List Cookies (By Site)`
3. `Set Cookie (Create/Update)`
4. `Delete Cookie (Single)`
5. `Import Cookies (Merge/Replace)`（按需）
6. `Clear Cookies (By Site/All)`（按需）

---

## 4. 常见问题排查

### 401 Unauthorized

可能原因：

- `apiToken` 错误或过期
- 请求头未携带 `X-GeekEZ-API-Token`

排查：

- 在 Postman 环境里确认 `apiToken` 不为空
- 打开请求 Headers，确认 token 头已生效

### 404 Profile not found

可能原因：

- `profileIdOrName` 不存在
- 目标环境被重命名/删除

排查：

- 用 `/api/profiles` 先确认环境列表
- 改用环境 ID（更稳定）

### 连接失败（ECONNREFUSED / timeout）

可能原因：

- GeekEZ API 服务未启动
- `baseUrl` 端口不对

排查：

- 在 GeekEZ 设置里确认 API 服务已开启
- 先请求 `/api/status` 验证连通性
- 检查本机防火墙/安全软件拦截

---

## 5. 与脚本联动

若希望命令行自动化，可直接使用：

- `npm run smoke:cookie-api`
- `npm run smoke:cookie-api:newman`

并通过环境变量覆盖：

- `GEEKEZ_API_BASE`
- `GEEKEZ_API_TOKEN`
- `GEEKEZ_PROFILE`
- `GEEKEZ_COOKIE_SITE`
