# swagger-reader-mcp

一个只读的 Swagger/OpenAPI MCP 服务，面向 `opencode` / MCP 客户端场景，支持：

- 列出接口列表
- 按关键词搜索接口
- 查看单个接口入参/出参详情
- 按 DTO 名称生成 TypeScript `interface`

> 设计目标：**只读解析** Swagger，不直接调用业务接口。

---

## 1. 环境要求

- Node.js 18+（推荐 Node.js 20+）
- npm

---

## 2. 安装依赖

```bash
npm install
```

---

## 3. 构建与启动

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 运行构建产物

```bash
npm start
```

---

## 4. 工具能力（MCP tools）

服务启动后会注册以下工具：

1. `list_swagger_apis`
   - 输入：`project?`、`swaggerUrl?`
   - 输出：接口列表（`method`、`path`、`summary`、`operationId`、`tags`）

2. `search_swagger_api`
   - 输入：`keyword`、`project?`、`swaggerUrl?`
   - 输出：按关键词匹配的接口列表

3. `get_swagger_api_detail`
   - 输入：`path`、`method`、`project?`、`swaggerUrl?`
   - 输出：接口详情（query/path/body 参数、响应 schema、推导类型、DTO interface）

4. `get_swagger_dto_interface`
   - 输入：`dtoName`、`project?`、`swaggerUrl?`
   - 输出：对应 DTO 的 TypeScript `interface`

---

## 5. 默认 Swagger 项目映射

当前内置：

- `market`: `http://172.24.2.66:81/company-management/v2/api-docs`
- `center`: `http://172.24.2.66:81/sso-admin/v2/api-docs`

调用工具时：

- 传 `project` 会命中内置映射
- 传 `swaggerUrl` 会优先使用该 URL

---

## 6. 在 opencode 中配置

在你的项目根目录新增 `opencode.json`（示例）：

```json
{
  "mcp": {
    "swagger-reader": {
      "type": "local",
      "command": ["node", "./swagger-reader-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

> 如果你的目录结构不同，请调整 `command` 路径。

---

## 7. 使用示例（在 MCP 客户端中）

- 搜索接口：
  - “用 `swagger-reader` 搜索 `center` 里 `virtualPowerPlantTransactionUnit` 相关接口”
- 读取接口详情：
  - “读取 `center` 的 `/virtualPowerPlantTransactionUnit/pageListCapabilityTest` 的 `POST` 入参和出参”
- 生成 DTO 类型：
  - “生成 `CapabilityTestQueryDTO` 的 TypeScript interface”

---

## 8. 常见问题

### Q1: `npm install` 失败（403/网络问题）

请检查：

- npm 源与网络策略
- 私有网络是否允许访问 `registry.npmjs.org`
- 是否需要公司内网代理配置

### Q2: 读取 Swagger 失败

请检查：

- Swagger URL 是否可访问
- 服务是否需要鉴权（本项目默认不处理鉴权）
- 文档是否为标准 Swagger/OpenAPI JSON

---

## 9. 后续扩展建议

- 增加 `generate_frontend_service`：根据 path + method 自动生成前端 service 方法
- 增加 DTO 递归展开与多文件 types 输出
- 增加缓存（按 URL + TTL）减少重复拉取 Swagger 的耗时
