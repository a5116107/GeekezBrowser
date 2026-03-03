# Cookie REST API 示例

> 适用：GeekEZ Browser 本地 API 服务（`/api/*`）  
> 认证：请求头 `X-GeekEZ-API-Token: <token>`
> Postman：可直接导入 `docs/postman/GeekEZ_Cookie_API.postman_collection.json`，环境模板见 `docs/postman/GeekEZ_Local.postman_environment.json`，详细说明见 `docs/postman/README.md`

## 前置

```bash
BASE="http://localhost:12138"
TOKEN="<your_api_token>"
PROFILE="your-profile-id-or-name"
```

---

## 1) 查看网站分组汇总

```bash
curl -H "X-GeekEZ-API-Token: $TOKEN" \
  "$BASE/api/profiles/$PROFILE/cookies/sites"
```

---

## 2) 查看 Cookie 列表（可按站点过滤）

```bash
# 全部
curl -H "X-GeekEZ-API-Token: $TOKEN" \
  "$BASE/api/profiles/$PROFILE/cookies"

# 指定站点
curl -H "X-GeekEZ-API-Token: $TOKEN" \
  "$BASE/api/profiles/$PROFILE/cookies?site=example.com"
```

---

## 3) 新增/更新单条 Cookie

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{
    "site": "example.com",
    "cookie": {
      "name": "session_id",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "Lax",
      "session": true
    }
  }' \
  "$BASE/api/profiles/$PROFILE/cookies"
```

---

## 4) 删除单条 Cookie

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{
    "site": "example.com",
    "cookie": {
      "name": "session_id",
      "domain": ".example.com",
      "path": "/"
    }
  }' \
  "$BASE/api/profiles/$PROFILE/cookies/delete"
```

---

## 5) 清空 Cookie（某网站或全部）

```bash
# 清空指定站点
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{"site":"example.com"}' \
  "$BASE/api/profiles/$PROFILE/cookies/clear"

# 清空整个环境全部 Cookie
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{}' \
  "$BASE/api/profiles/$PROFILE/cookies/clear"
```

---

## 6) 导出 Cookie（直接返回 JSON）

```bash
curl -H "X-GeekEZ-API-Token: $TOKEN" \
  "$BASE/api/profiles/$PROFILE/cookies/export?site=example.com"
```

---

## 7) 导入 Cookie（Merge / Replace）

```bash
# Merge（保留现有）
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{
    "site": "example.com",
    "mode": "merge",
    "content": {
      "cookies": [
        {
          "name": "session_id",
          "value": "new-value",
          "domain": ".example.com",
          "path": "/",
          "secure": true,
          "httpOnly": true,
          "session": true
        }
      ]
    }
  }' \
  "$BASE/api/profiles/$PROFILE/cookies/import"

# Replace（先清空当前 scope）
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GeekEZ-API-Token: $TOKEN" \
  -d '{
    "site": "example.com",
    "mode": "replace",
    "content": {
      "cookies": [
        {
          "name": "session_id",
          "value": "replace-value",
          "domain": ".example.com",
          "path": "/",
          "secure": true,
          "httpOnly": true,
          "session": true
        }
      ]
    }
  }' \
  "$BASE/api/profiles/$PROFILE/cookies/import"
```

---

## 备注

- `idOrName` 支持环境 `id` 或 `name`
- `site` 传根域或子域都可以（例如 `example.com`、`a.example.com`）
- `mode` 可选值：`merge`（默认）/`replace`

---

## 一键冒烟（可选）

### Node 直连 smoke（推荐先跑）

```bash
# 必填：token + profile
GEEKEZ_API_TOKEN="<token>" \
GEEKEZ_PROFILE="<profile-id-or-name>" \
npm run smoke:cookie-api
```

可选变量：

- `GEEKEZ_API_BASE`（默认 `http://localhost:12138`）
- `GEEKEZ_COOKIE_SITE`（默认 `example.com`）

### Newman 跑 Postman Collection

```bash
# 必填：token + profile
GEEKEZ_API_TOKEN="<token>" \
GEEKEZ_PROFILE="<profile-id-or-name>" \
npm run smoke:cookie-api:newman
```

说明：该命令会自动执行 `npx --yes newman run ...`，使用仓库内置 collection + environment 模板。

### GitHub Actions 手动触发（可选）

- 工作流文件：`.github/workflows/cookie-api-smoke.yml`
- 必需条件：
  - Repository Secret：`GEEKEZ_API_TOKEN`
  - Dispatch 输入：`profile_id_or_name`
- 可选输入：
  - `base_url`（默认 `http://localhost:12138`）
  - `site`（默认 `example.com`）
  - `run_newman`（默认 `true`）
