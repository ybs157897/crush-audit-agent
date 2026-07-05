---
name: java-auth-audit
description: Java Web 鉴权机制分析与绕过检测。审计 Shiro、Spring Security、自定义 Filter 的配置，检测鉴权绕过、越权访问、Actuator 暴露等问题。
user-invocable: true
---

# Java 鉴权审计

分析 Java Web 项目的鉴权机制，检测鉴权绕过和越权漏洞。

## 检测步骤

### 1. 识别安全框架

用 `grep` 搜索安全框架配置：

**Shiro**：
- `ShiroFilterFactoryBean`, `ShiroConfig`, `filterChainDefinitionMap`
- `@RequiresPermissions`, `@RequiresRoles`, `@RequiresAuthentication`
- `SecurityManager`, `Realm`

**Spring Security**：
- `SecurityConfig`, `HttpSecurity`, `WebSecurityConfigurerAdapter`
- `authorizeRequests`, `antMatchers`, `mvcMatchers`
- `@PreAuthorize`, `@Secured`, `@RolesAllowed`

**自定义鉴权**：
- `implements Filter`, `doFilter`, `OncePerRequestFilter`
- `HandlerInterceptor`, `preHandle`
- 自定义注解 + AOP

### 2. 分析路由鉴权覆盖

1. 用 `view` 读取安全配置类，提取路由→权限映射
2. 对比路由清单（如果有），找出：
   - 未配置鉴权的路由（默认放行）
   - 通配符过宽的配置（`/**` 但遗漏了子路径）
   - 静态资源路径泄露（`/static/**` 包含了敏感文件）

### 3. 检测鉴权绕过

**路径绕过模式**：
- `/admin;.js` 绕过 Filter（分号截断）
- `/admin/..;/` 绕过路径匹配
- `/ADMIN` 大小写绕过（取决于容器配置）
- `/admin%00` 空字节截断

**Spring Security 常见绕过**：
- `antMatchers("/api/**")` 未覆盖 `/api`（无尾斜杠）
- `permitAll()` 配置错误
- CORS 配置过于宽松

**Shiro 常见绕过**：
- `filterChainDefinitionMap.put("/api/*", "anon")` 只匹配一级路径
- RememberMe 反序列化（硬编码密钥）

### 4. 检查 Actuator 暴露

搜索 `application.yml` / `application.properties`：
```yaml
management.endpoints.web.exposure.include: *  # 危险
management.endpoint.env.enabled: true          # 泄露环境变量
management.endpoint.heapdump.enabled: true     # 泄露内存数据
```

## 输出格式

写入 `{项目名}_audit/auth_audit/auth_report.md`：

```markdown
# 鉴权审计报告

## 安全框架：Spring Security / Shiro / 自定义

## 路由鉴权状态

| 路由 | 鉴权 | 风险等级 | 说明 |
|------|------|---------|------|
| /api/admin/** | @PreAuthorize("hasRole('ADMIN')") | P2 | 正常 |
| /api/public/* | anon | P1 | 通配符过宽，可能泄露子路径 |
| /actuator/env | 无鉴权 | P0 | 环境变量泄露 |

## 绕过风险

### [High] Shiro 通配符配置缺陷
- **位置**：`ShiroConfig.java:35`
- **问题**：`/api/*` 只匹配一级路径，`/api/admin/users` 未受保护
- **修复**：改为 `/api/**`

### [Critical] Actuator 完全暴露
- **位置**：`application.yml:12`
- **问题**：`management.endpoints.web.exposure.include: *`
- **影响**：环境变量、堆转储、配置信息全部可访问
```
