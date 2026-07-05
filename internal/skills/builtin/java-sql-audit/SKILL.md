---
name: java-sql-audit
description: Java SQL 注入漏洞检测。扫描 MyBatis ${}、JDBC 字符串拼接、HQL/JPQL 注入，结合调用链追踪确认用户输入是否到达 Sink。
user-invocable: true
---

# Java SQL 注入审计

检测 Java Web 项目中的 SQL 注入漏洞，覆盖 MyBatis、JDBC、JPA/HQL 三大框架。

## 检测 Sink

### MyBatis 注入

用 `grep` 搜索 Mapper XML 文件中的 `${` 模式：
```xml
${orderBy}        <!-- 危险：直接拼接 -->
${columnName}     <!-- 危险 -->
#{param}          <!-- 安全：参数化 -->
```

对比 `${}` 和 `#{}` 的使用。`${}` 用于动态表名/列名时风险最高。

### JDBC 注入

搜索 `Statement` + 字符串拼接模式：
```java
"SELECT * FROM " + table           // 危险
"WHERE id = " + request.getParam() // 高危
stmt.executeQuery(sql + userInput) // 高危
```

对比安全用法：`PreparedStatement` + `?` 占位符。

### JPA/HQL 注入

搜索：
```java
entityManager.createQuery("... " + variable)  // 危险
session.createQuery("... " + variable)         // 危险
```

对比安全用法：`setParameter()` 或 Criteria API。

### ORDER BY / LIMIT 注入

特别检查排序字段和分页参数：
```java
"ORDER BY " + request.getParameter("sort")    // 高危
"LIMIT " + page.getSize()                      // 中危
```

## 调用链验证

对每个发现的 Sink：
1. 用 `view` 读取包含 Sink 的方法
2. 向上追踪调用者（搜索方法名被谁调用）
3. 确认参数来源：
   - 直接来自 `@RequestParam` / `HttpServletRequest.getParameter()` → **确认漏洞**
   - 经过白名单校验 / 编码处理 → **降级或排除**
   - 硬编码值 → **排除（误报）**

## 输出格式

写入 `{项目名}_audit/sql_audit/sql_injection.md`：

```markdown
## [Critical] SQL 注入 - UserController.search()

**文件**：`src/main/java/com/example/UserController.java:45`
**Sink**：`"ORDER BY " + request.getParameter("sort")`
**调用链**：`Controller.search() → UserService.searchUsers() → UserMapper.search()`
**参数来源**：HTTP 请求参数 `sort`，无校验
**修复建议**：使用白名单校验排序字段，或使用参数化查询
```
