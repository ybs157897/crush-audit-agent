---
name: java-file-read-audit
description: Java 任意文件读取漏洞检测。扫描 FileInputStream、Files.read 等操作，检测路径穿越和敏感文件泄露。
user-invocable: true
---

# Java 文件读取审计

检测 Java 项目中的任意文件读取/路径遍历漏洞。

## 检测 Sink

用 `grep` 搜索：

1. `FileInputStream` + 用户可控路径
2. `Files.readAllBytes(` / `Files.readString(` / `Files.lines(`
3. `getResourceAsStream(` + 用户输入
4. `new File(` + 用户输入 + 读取操作
5. `IOUtils.toString(` / `IOUtils.toByteArray(`
6. `ClassPathResource(` + 用户输入

## 关键检查

对每个 Sink，用 `view` 确认：

1. **路径来源**：文件路径参数是否来自用户输入？
2. **路径规范化**：是否调用了 `getCanonicalPath()` / `normalize()` 消除 `../`？
3. **路径限制**：是否限制了读取范围（如必须在某个目录下）？
4. **符号链接**：是否检查了符号链接？

```java
// 安全检查示例
String canonicalPath = new File(baseDir, userInput).getCanonicalPath();
if (!canonicalPath.startsWith(baseDir)) {
    throw new SecurityException("Path traversal detected");
}
```

## 输出格式

写入 `{项目名}_audit/file_read_audit/`：

```markdown
## [High] 任意文件读取 - DownloadController.getFile()

**文件**：`DownloadController.java:22`
**Sink**：`new FileInputStream(request.getParameter("file"))`
**问题**：路径参数直接来自用户输入，未做路径校验
**影响**：可读取 `/etc/passwd`、应用配置文件、数据库凭据
**修复建议**：
```java
Path basePath = Paths.get("/data/uploads").normalize();
Path target = basePath.resolve(request.getParameter("file")).normalize();
if (!target.startsWith(basePath)) {
    return ResponseEntity.badRequest().body("Invalid path");
}
```
```
