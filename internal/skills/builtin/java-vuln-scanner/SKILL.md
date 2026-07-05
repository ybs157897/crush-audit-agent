---
name: java-vuln-scanner
description: Java 组件漏洞扫描。解析 pom.xml / build.gradle 中的依赖，通过 OSV.dev API 实时查询已知 CVE，覆盖 Log4j、Fastjson、Spring、Shiro 等 3000+ 漏洞。
user-invocable: true
---

# Java 组件漏洞扫描

扫描 Java 项目的第三方依赖，查询 OSV.dev 获取已知 CVE 漏洞。

## 执行方式

### 方式一：使用 security_scan 工具（推荐）

调用 `security_scan` 工具，指定 `engine: "osv"`：

```
security_scan(path="<项目路径>", engine="osv")
```

工具会自动：
1. 解析 pom.xml / build.gradle 中的依赖
2. 查询 OSV.dev API 获取 CVE 列表
3. 返回结构化的漏洞报告

### 方式二：手动分析

如果工具不可用，手动执行：

1. 用 `view` 读取 `pom.xml` 或 `build.gradle`
2. 提取所有依赖（groupId:artifactId:version）
3. 用 `bash` 调用 OSV.dev API：

```bash
curl -s -X POST https://api.osv.dev/v1/query \
  -H "Content-Type: application/json" \
  -d '{"package":{"name":"org.apache.logging.log4j:log4j-core","ecosystem":"Maven"},"version":"2.14.1"}'
```

## 重点关注的组件

| 组件 | 高危 CVE | 影响 |
|------|---------|------|
| Log4j | CVE-2021-44228 (Log4Shell) | RCE |
| Fastjson | CVE-2022-25845 | 反序列化 RCE |
| Spring Framework | CVE-2022-22965 (Spring4Shell) | RCE |
| Shiro | CVE-2016-4437 (RememberMe) | 反序列化 RCE |
| Jackson | CVE-2020-36518 | DoS |
| Commons Collections | 多个 | 反序列化 gadget |
| XStream | CVE-2021-43859 | 反序列化 RCE |
| Struts2 | 多个 RCE | 表达式注入 |

## 输出格式

写入 `{项目名}_audit/vuln_report/component_vulns.md`：

```markdown
# 组件漏洞报告

## 总览
- 依赖总数：X
- 存在漏洞的依赖：X
- CVE 总数：X（Critical: X, High: X, Medium: X）

## 漏洞详情

### org.apache.logging.log4j:log4j-core@2.14.1
- 🔴 **CVE-2021-44228** (CVSS 10.0): Log4Shell RCE
  - 修复版本：2.17.0+
  - CWE: CWE-502, CWE-400, CWE-20

### com.alibaba:fastjson@1.2.68
- 🔴 **CVE-2022-25845** (CVSS 8.1): 反序列化 RCE
  - 修复版本：1.2.83+ / 迁移到 fastjson2
```
