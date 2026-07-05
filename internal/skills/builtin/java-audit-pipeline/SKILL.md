---
name: java-audit-pipeline
description: Java Web 全链路自动化安全审计。输入项目路径，执行 7 阶段流水线——快速匹配、路由识别、调用链追踪、8 种漏洞检测、利用链编排——最终产出审计报告。覆盖 SQL 注入/反序列化/SSRF/表达式注入/XXE/文件上传/鉴权绕过 + OSV.dev CVE。支持快速模式和增量审计。
user-invocable: true
---

# Java Web 全链路自动化安全审计

输入一个 Java Web 项目路径，自动完成 7 阶段安全审计流水线。

## 使用方式

用户提供项目路径后，按以下流程执行。根据项目规模选择模式：

- **快速模式**（用户说 `--quick` 或小项目 <50 路由）：跳过阶段 3/5，串行执行
- **标准模式**（默认）：完整 7 阶段
- **增量模式**（用户说 `--incremental`）：只审计 git diff 变更的文件

## 前置步骤

1. 确认项目路径存在且包含 Java 文件（`.java`、`pom.xml`、`build.gradle`）
2. 创建审计输出目录：`{项目名}_audit/`
3. 如果是增量模式，先执行 `git diff --name-only` 获取变更文件列表

---

## 阶段 0 · 快速匹配（秒级）

**目标**：用 grep 工具秒级扫描 8 条高危模式，命中立即记录。

用 `grep` 工具依次搜索以下模式（在项目根目录递归搜索 `.java` 文件）：

| 模式 | 风险 |
|------|------|
| `Runtime.getRuntime().exec` | 命令注入 |
| `JNDI` / `InitialContext` / `lookup(` | JNDI 注入 |
| `ObjectInputStream` / `readObject` | 反序列化 |
| `ProcessBuilder` | 命令注入 |
| `ScriptEngine.*eval` | 代码注入 |
| `URLClassLoader` / `defineClass` | 类加载 |
| `setReadable(false)` / `setWritable(true)` | 权限绕过 |
| `@CrossOrigin` / `allowedOrigins("*")` | CORS 配置 |

将命中结果写入 `{项目名}_audit/quick_hits/` 目录，按类型分文件。
标注严重级别：命中即 P0（立即报告）。

---

## 阶段 1 · 信息收集

### 1a. 路由提取

用 `grep` + `view` 工具提取所有 HTTP 端点：

1. 搜索注解：`@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`
2. 搜索 JAX-RS：`@GET`, `@POST`, `@PUT`, `@DELETE`, `@Path`
3. 搜索 Struts：`struts.xml` 中的 `<action>` 标签
4. 搜索 Spring WebFlux：`RouterFunction`, `route(`

对每个路由提取：
- HTTP 方法 + URL 路径
- Controller 类名和方法名
- 参数列表（`@RequestParam`, `@PathVariable`, `@RequestBody`, `@ModelAttribute`）
- 参数类型和来源

将路由清单写入 `{项目名}_audit/route_mapper/routes.md`。

### 1b. 鉴权审计

用 `grep` + `view` 分析每条路由的鉴权状态：

1. 搜索安全框架配置：
   - Shiro：`ShiroFilterFactoryBean`, `filterChainDefinitionMap`, `ShiroConfig`
   - Spring Security：`SecurityConfig`, `HttpSecurity`, `WebSecurityConfigurerAdapter`, `authorizeRequests`
   - 自定义 Filter：`implements Filter`, `doFilter`, `OncePerRequestFilter`
   - 自定义注解：`@RequiresPermissions`, `@PreAuthorize`, `@Secured`

2. 对每条路由标注鉴权状态：
   - **P0**：无鉴权（公开接口）
   - **P1**：鉴权可绕过（路径匹配缺陷、通配符过宽、方法绕过如 `/admin;.js`）
   - **P2**：有鉴权保护

3. 检查 Actuator 暴露：搜索 `management.endpoints.web.exposure.include`

将鉴权分析写入 `{项目名}_audit/auth_audit/`。

### 1c. 组件漏洞扫描

调用 `security_scan` 工具，使用 `engine: "osv"` 参数：

```
security_scan(path="<项目路径>", engine="osv")
```

这会解析 pom.xml / build.gradle 中的依赖，查询 OSV.dev 获取已知 CVE。
将结果写入 `{项目名}_audit/vuln_report/`。

---

## 阶段 2 · 交叉筛选

**目标**：合并阶段 1 的结果，确定审计优先级。

1. 将路由按风险分级：
   - **P0 路由**：无鉴权 + 接收用户输入
   - **P1 路由**：鉴权可绕过 + 接收用户输入
   - **P2 路由**：有鉴权保护

2. 合并组件漏洞与鉴权绕过：如果某个有漏洞的组件被 P0/P1 路由使用，升级优先级

3. 确定阶段 4 需要启动哪些检测引擎（只启动有对应 Sink 的检测）

将交叉分析写入 `{项目名}_audit/cross_analysis/`。

---

## 阶段 3 · 调用链追踪

**目标**：从 Controller 追踪到 DAO/Service，确认参数是否真正到达 Sink。

对每条 P0/P1 路由：

1. 从 Controller 方法开始，用 `view` 工具读取方法体
2. 找到调用的 Service 方法（搜索 `@Autowired`, 构造函数注入, `@Resource`）
3. 继续追踪到 DAO 层（MyBatis Mapper, JPA Repository, JDBC Template）
4. 标注参数传递路径：
   - 参数是否经过安全处理（编码、过滤、白名单校验）
   - 参数是否被硬编码覆盖（消除误报）
   - 参数是否真正到达 Sink 点

记录调用链：`Controller.method() → Service.method() → DAO.method() → Sink`

将追踪结果写入 `{项目名}_audit/route_tracer/`。

---

## 阶段 4 · 漏洞深度检测

根据阶段 2 确定的 Sink 类型，启动对应的检测。每个检测独立执行。

### 4a. SQL 注入检测

搜索 Sink 模式：
- MyBatis：`${}` 拼接（对比 `#{}` 安全参数化）
- JDBC：`Statement.execute*` + 字符串拼接（对比 `PreparedStatement`）
- JPA/HQL：`createQuery` + 字符串拼接
- 框架：`orderBy` / `sort` 字段直接拼接

对每个 Sink，结合阶段 3 的调用链确认用户输入是否到达。
写入 `{项目名}_audit/sql_audit/`。

### 4b. 反序列化检测

搜索 Sink 模式：
- `ObjectInputStream.readObject()`
- `JSON.parseObject(` / `JSON.parse(`（Fastjson）
- `ObjectMapper.readValue(`（Jackson，检查 `enableDefaultTyping`）
- `Hessian.*readObject(`
- `XMLDecoder`
- `Yaml.load(`（SnakeYAML，检查是否设置安全构造器）

检查 classpath 中是否存在已知 gadget 链（CommonsCollections, C3P0, JNDI 等）。
写入 `{项目名}_audit/deserialization_audit/`。

### 4c. SSRF 检测

搜索 12 种 HTTP 客户端 Sink：
- `RestTemplate.getForObject/exchange/postForObject`
- `HttpClient.newHttpClient` + `send(`
- `OkHttpClient` + `newCall(`
- `HttpURLConnection` / `URLConnection`
- `WebClient.get()/post()`
- `FeignClient` 接口
- `CloseableHttpClient.execute(`

检查 URL 参数是否来自用户输入，是否校验了协议/域名/内网地址。
写入 `{项目名}_audit/ssrf_audit/`。

### 4d. 表达式注入检测

搜索 10+ 种表达式引擎 Sink：
- OGNL：`OgnlUtil.getValue(`, `ValueStack.findValue(`
- SpEL：`SpelExpressionParser`, `ExpressionParser.parseExpression(`
- MVEL：`MVEL.eval(`
- FreeMarker：`Template(`, `freemarker.template`
- Velocity：`VelocityEngine.evaluate(`
- Thymeleaf：`th:text="${...}"`（用户可控变量）
- JEXL：`JexlEngine.createExpression(`
- EL：`ExpressionFactory.createValueExpression(`

写入 `{项目名}_audit/expr_inject_audit/`。

### 4e. XXE 检测

搜索 5 种 XML 解析器：
- `SAXReader` / `SAXParser` / `DocumentBuilder`
- `XMLInputFactory` / `TransformerFactory`
- `Unmarshaller`（JAXB）

检查是否禁用了外部实体：
- `setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`
- `setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)`

写入 `{项目名}_audit/xxe_audit/`。

### 4f. 文件上传/读取检测

**文件上传**：搜索 `MultipartFile`, `transferTo(`, `getOriginalFilename(`。
检查是否校验了文件类型、大小、路径穿越。

**文件读取**：搜索 `FileInputStream`, `Files.read*`, `getResourceAsStream`。
检查路径参数是否来自用户输入，是否做了路径规范化。

写入 `{项目名}_audit/file_upload_audit/` 和 `{项目名}_audit/file_read_audit/`。

---

## 阶段 5 · 利用链编排

**目标**：将零散的中危漏洞组合升级为高危攻击链。

检查以下 8 种利用链模板：

| 链名 | 组合条件 | 升级结果 |
|------|---------|---------|
| Shiro RememberMe RCE | Shiro 密钥泄露 + 反序列化 Sink | Critical |
| Actuator → RCE | Actuator 暴露 + 环境变量/配置读取 | Critical |
| SSRF → 云元数据 | SSRF + 云环境（AWS/GCP/Aliyun） | Critical |
| 文件读取 → 密钥 → RCE | 任意文件读取 + 读取到 Shiro/数据库密钥 | Critical |
| SQL 注入 → 数据泄露 | SQL 注入 + 敏感表查询 | High→Critical |
| XXE → SSRF | XXE + 内网探测 | High |
| 反序列化 → JNDI | 反序列化 + JNDI lookup | Critical |
| 鉴权绕过 → 管理功能 | 鉴权绕过 + 管理接口 | Critical |

对每条命中的利用链，编写完整的攻击路径描述和 PoC 思路。

---

## 阶段 6 · 汇总报告

生成 `{项目名}_audit/quality_report.md`，包含：

```markdown
# {项目名} 安全审计报告

## 总览
- 路由总数：X
- P0 路由（无鉴权）：X
- P1 路由（可绕过）：X
- 漏洞总数：X（Critical: X, High: X, Medium: X, Low: X）
- 利用链：X 条

## 高危发现（按优先级排序）
### [Critical] 漏洞名称
- **位置**：文件路径:行号
- **描述**：漏洞描述
- **PoC**：利用思路
- **修复建议**：具体修复方案
- **CVSS**：评分（如有）

## 组件漏洞
（OSV.dev 扫描结果摘要）

## 利用链
（阶段 5 的完整攻击路径）

## 审计统计
- 审计耗时
- 覆盖路由数 / 总路由数
- 各阶段检出数
```

---

## 注意事项

- 调用链追踪是消除误报的关键：如果参数被安全函数处理或硬编码覆盖，排除该发现
- 对大型项目（1000+ 路由），优先审计 P0 路由，P2 路由可跳过
- 如果流水线中断，将已完成的结果写入 `PARTIAL_RESULTS.md`
- 所有发现必须包含：文件路径、行号、代码片段、修复建议
