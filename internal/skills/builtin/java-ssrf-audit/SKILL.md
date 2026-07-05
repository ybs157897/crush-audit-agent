---
name: java-ssrf-audit
description: Java SSRF 漏洞检测。扫描 RestTemplate、HttpClient、OkHttp 等 12 种 HTTP 客户端 Sink，检测用户可控 URL 导致的服务端请求伪造。
user-invocable: true
---

# Java SSRF 审计

检测 Java 项目中的服务端请求伪造（SSRF）漏洞。

## 检测 Sink

用 `grep` 搜索以下 HTTP 客户端模式：

1. `RestTemplate` — `getForObject(`, `exchange(`, `postForObject(`, `getForEntity(`
2. `HttpClient` — `HttpClient.newHttpClient(` + `.send(`
3. `OkHttpClient` — `newCall(`, `OkHttpClient(`
4. `HttpURLConnection` — `openConnection(`, `URLConnection`
5. `WebClient` — `WebClient.builder(`, `.get(`, `.post(`
6. `CloseableHttpClient` — `.execute(`
7. `FeignClient` — `@FeignClient` 接口 + 动态 URL
8. `Jsoup.connect(` — HTML 解析
9. `URL(` + `.openStream(` / `.openConnection(`
10. `Apache HttpClient` — `HttpGet(`, `HttpPost(`

## 关键检查

对每个 Sink，用 `view` 读取上下文确认：
1. URL 参数是否来自用户输入（`@RequestParam`, `HttpServletRequest.getParameter()`）
2. 是否校验了协议（仅允许 http/https）
3. 是否校验了域名（禁止内网 IP、`127.0.0.1`、`169.254.169.254` 云元数据）
4. 是否禁止了重定向跟随（防止 SSRF 绕过）

## 输出格式

写入 `{项目名}_audit/ssrf_audit/`：

```markdown
## [High] SSRF - ProxyController.fetch()

**文件**：`ProxyController.java:35`
**Sink**：`restTemplate.getForObject(url, String.class)`
**参数来源**：`@RequestParam("url") String url`，无校验
**影响**：可访问内网服务、云元数据（169.254.169.254）
**修复建议**：白名单校验域名，禁止内网 IP 和云元数据地址
```
