---
name: java-route-mapper
description: 提取 Java Web 项目中所有 HTTP 路由及其参数结构。识别 Spring MVC/WebFlux、JAX-RS、Struts2 路由注解，输出完整的路由清单。
user-invocable: true
---

# Java 路由提取

提取目标 Java Web 项目中的所有 HTTP 端点，输出结构化路由清单。

## 执行步骤

### 1. Spring MVC 路由

用 `grep` 搜索以下注解（递归搜索 `.java` 文件）：

```
@RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping
```

对每个命中的方法，用 `view` 读取完整方法体，提取：
- **类级路径**：`@RequestMapping("/api/v1")` 在类上的值
- **方法级路径**：注解中的路径值
- **HTTP 方法**：注解类型决定（GetMapping → GET）
- **参数**：
  - `@RequestParam` → query 参数
  - `@PathVariable` → 路径参数
  - `@RequestBody` → 请求体（记录类型）
  - `@ModelAttribute` → 表单参数
  - `@RequestHeader` → 请求头
  - `@CookieValue` → Cookie

### 2. JAX-RS 路由

搜索：`@Path`, `@GET`, `@POST`, `@PUT`, `@DELETE`, `@PATCH`

### 3. Spring WebFlux 路由

搜索：`RouterFunction`, `route(`, `GET(`, `POST(`

### 4. Struts2 路由

搜索 `struts.xml` 或 `struts-*.xml` 中的 `<action>` 标签。

## 输出格式

将路由清单写入 `{项目名}_audit/route_mapper/routes.md`：

```markdown
# 路由清单

## 总计：X 条路由

| # | HTTP | 路径 | Controller | 方法 | 鉴权 | 参数 |
|---|------|------|-----------|------|------|------|
| 1 | GET  | /api/users/{id} | UserController | getUser | 未知 | id(path) |
| 2 | POST | /api/login | AuthController | login | 无 | username(param), password(param) |
```

对每个路由标注参数来源和类型，便于后续漏洞检测。
