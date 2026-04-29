#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadSwagger, listApis, searchApis, getApiDetail, definitionToInterface } from './swagger.js'

const server = new McpServer({
  name: 'swagger-reader-mcp',
  version: '1.0.0',
})

server.tool(
  'list_swagger_apis',
  '读取 Swagger 接口列表，返回 method、path、summary、operationId、tags',
  {
    project: z.string().optional().describe('内置项目名，如 market / center'),
    swaggerUrl: z.string().optional().describe('Swagger JSON 地址'),
  },
  async (args) => {
    const swagger = await loadSwagger(args)
    const apis = listApis(swagger)
    return { content: [{ type: 'text', text: JSON.stringify(apis, null, 2) }] }
  }
)

server.tool(
  'search_swagger_api',
  '按关键词搜索 Swagger 接口，支持 path、summary、operationId、tags',
  {
    keyword: z.string().describe('搜索关键词'),
    project: z.string().optional(),
    swaggerUrl: z.string().optional(),
  },
  async (args) => {
    const swagger = await loadSwagger(args)
    const apis = searchApis(swagger, args.keyword)
    return { content: [{ type: 'text', text: JSON.stringify(apis, null, 2) }] }
  }
)

server.tool(
  'get_swagger_api_detail',
  '读取某个 Swagger 接口详情，包括 query 参数、body DTO、response DTO、TypeScript interface',
  {
    path: z.string().describe('接口路径，例如 /virtualPowerPlantTransactionUnit/pageListCapabilityTest'),
    method: z.string().describe('请求方法，例如 get/post/put/delete'),
    project: z.string().optional(),
    swaggerUrl: z.string().optional(),
  },
  async (args) => {
    const swagger = await loadSwagger(args)
    const detail = getApiDetail(swagger, args.path, args.method)
    return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] }
  }
)

server.tool(
  'get_swagger_dto_interface',
  '按 DTO 名称生成 TypeScript interface',
  {
    dtoName: z.string().describe('DTO 名称，例如 CapabilityTestQueryDTO'),
    project: z.string().optional(),
    swaggerUrl: z.string().optional(),
  },
  async (args) => {
    const swagger = await loadSwagger(args)
    const code = definitionToInterface(swagger, args.dtoName)
    return { content: [{ type: 'text', text: code }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
