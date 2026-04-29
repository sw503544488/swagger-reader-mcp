type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch'

const defaultSwaggerMap: Record<string, string> = {
  market: 'http://172.24.2.66:81/company-management/v2/api-docs',
  center: 'http://172.24.2.66:81/sso-admin/v2/api-docs',
}

export function getSwaggerUrl(input: { swaggerUrl?: string; project?: string }) {
  if (input.swaggerUrl) return input.swaggerUrl

  const project = input.project || 'center'
  const url = defaultSwaggerMap[project]

  if (!url) {
    throw new Error(`未知 project: ${project}，请传 swaggerUrl 或配置 swaggerMap`)
  }

  return url
}

export async function loadSwagger(input: { swaggerUrl?: string; project?: string }) {
  const url = getSwaggerUrl(input)
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Swagger 获取失败: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

function getRefName(ref?: string) {
  if (!ref) return ''
  return ref.split('/').pop() || ''
}

function resolveRef(swagger: any, ref?: string) {
  const name = getRefName(ref)
  return swagger.definitions?.[name] || swagger.components?.schemas?.[name]
}

function schemaToTs(swagger: any, schema: any, visited = new Set<string>()): string {
  if (!schema) return 'any'

  if (schema.$ref) {
    const name = getRefName(schema.$ref)
    if (visited.has(name)) return name

    const resolved = resolveRef(swagger, schema.$ref)
    if (!resolved) return name || 'any'

    return name
  }

  if (schema.type === 'array') {
    return `${schemaToTs(swagger, schema.items, visited)}[]`
  }

  if (schema.type === 'integer' || schema.type === 'number') return 'number'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'string') return 'string'
  if (schema.type === 'object') return objectSchemaToTs(swagger, schema, visited)

  return 'any'
}

function objectSchemaToTs(swagger: any, schema: any, visited = new Set<string>()) {
  const props = schema.properties || {}
  const required = new Set<string>(schema.required || [])

  const lines = Object.entries<any>(props).map(([key, value]) => {
    const optional = required.has(key) ? '' : '?'
    const desc = value.description ? ` /** ${value.description} */\n  ` : '  '
    return `${desc}${key}${optional}: ${schemaToTs(swagger, value, visited)}`
  })

  return `\n{\n${lines.join('\n')}\n}`
}

export function definitionToInterface(swagger: any, name: string, visited = new Set<string>()) {
  const schema = swagger.definitions?.[name] || swagger.components?.schemas?.[name]
  if (!schema) return `// 未找到 DTO: ${name}`

  visited.add(name)

  const props = schema.properties || {}
  const required = new Set<string>(schema.required || [])

  const lines = Object.entries<any>(props).map(([key, value]) => {
    const optional = required.has(key) ? '' : '?'
    const desc = value.description ? `  /** ${value.description} */\n` : ''
    return `${desc}  ${key}${optional}: ${schemaToTs(swagger, value, visited)}`
  })

  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

export function listApis(swagger: any) {
  const paths = swagger.paths || {}
  const result: any[] = []

  Object.entries<any>(paths).forEach(([path, methods]) => {
    Object.entries<any>(methods).forEach(([method, operation]) => {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) return

      result.push({
        method: method.toUpperCase(),
        path,
        summary: operation.summary || '',
        operationId: operation.operationId || '',
        tags: operation.tags || [],
      })
    })
  })

  return result
}

export function searchApis(swagger: any, keyword: string) {
  const lower = keyword.toLowerCase()

  return listApis(swagger).filter((api) => {
    return [api.path, api.summary, api.operationId, ...(api.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(lower)
  })
}

export function getApiDetail(swagger: any, path: string, method: string) {
  const operation = swagger.paths?.[path]?.[method.toLowerCase() as HttpMethod]

  if (!operation) {
    throw new Error(`未找到接口: ${method.toUpperCase()} ${path}`)
  }

  const parameters = operation.parameters || []

  const queryParams = parameters.filter((p: any) => p.in === 'query')
  const pathParams = parameters.filter((p: any) => p.in === 'path')
  const bodyParam = parameters.find((p: any) => p.in === 'body')

  const requestBodySchema =
    bodyParam?.schema || operation.requestBody?.content?.['application/json']?.schema

  const responseSchema =
    operation.responses?.['200']?.schema ||
    operation.responses?.['200']?.content?.['application/json']?.schema ||
    operation.responses?.['default']?.schema

  const requestDtoName = getRefName(requestBodySchema?.$ref)
  const responseDtoName = getRefName(responseSchema?.$ref)

  return {
    method: method.toUpperCase(),
    path,
    summary: operation.summary || '',
    description: operation.description || '',
    operationId: operation.operationId || '',
    tags: operation.tags || [],
    queryParams: queryParams.map((p: any) => ({
      name: p.name,
      type: p.type || schemaToTs(swagger, p.schema),
      required: !!p.required,
      description: p.description || '',
    })),
    pathParams: pathParams.map((p: any) => ({
      name: p.name,
      type: p.type || schemaToTs(swagger, p.schema),
      required: !!p.required,
      description: p.description || '',
    })),
    requestDtoName,
    responseDtoName,
    requestType: requestBodySchema ? schemaToTs(swagger, requestBodySchema) : 'void',
    responseType: responseSchema ? schemaToTs(swagger, responseSchema) : 'any',
    requestInterface: requestDtoName ? definitionToInterface(swagger, requestDtoName) : '',
    responseInterface: responseDtoName ? definitionToInterface(swagger, responseDtoName) : '',
  }
}
