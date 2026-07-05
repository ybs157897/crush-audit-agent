---
name: java-file-upload-audit
description: Java 文件上传漏洞检测。扫描 MultipartFile、文件写入操作，检测任意文件上传、路径穿越、Web 目录写入等问题。
user-invocable: true
---

# Java 文件上传审计

检测 Java 项目中的文件上传漏洞。

## 检测 Sink

用 `grep` 搜索：

1. `MultipartFile` — `transferTo(`, `getOriginalFilename(`, `getBytes(`
2. `Part.write(` — Servlet 文件上传
3. `FileOutputStream` + 用户可控路径
4. `Files.write(` / `Files.copy(`
5. `IOUtils.copy(` + 文件输出

## 关键检查

对每个 Sink，用 `view` 确认：

1. **文件类型校验**：是否检查了 Content-Type 和文件扩展名？是否使用白名单？
2. **文件名处理**：`getOriginalFilename()` 直接用于存储路径？→ 路径穿越
3. **存储路径**：是否写入 Web 可访问目录（`/static/`, `/uploads/`, `webapp/`）？
4. **文件大小**：是否限制了上传大小？
5. **内容校验**：是否检查了文件内容（魔数/文件头）？

## 输出格式

写入 `{项目名}_audit/file_upload_audit/`：

```markdown
## [High] 任意文件上传 - FileController.upload()

**文件**：`FileController.java:35`
**Sink**：`file.transferTo(new File(uploadDir + file.getOriginalFilename()))`
**问题**：
- 未校验文件类型（可上传 .jsp/.jspx）
- 文件名未过滤（`../../etc/passwd` 路径穿越）
- 写入 Web 可访问目录
**修复建议**：
1. 白名单校验文件扩展名
2. 重命名文件（UUID）
3. 存储到非 Web 可访问目录
```
