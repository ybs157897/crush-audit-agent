---
name: java-xxe-audit
description: Java XXE（XML 外部实体注入）漏洞检测。扫描 SAXParser、DocumentBuilder、XMLInputFactory 等 XML 解析器，检查是否禁用了外部实体。
user-invocable: true
---

# Java XXE 审计

检测 Java 项目中的 XML 外部实体注入漏洞。

## 检测 Sink

用 `grep` 搜索以下 XML 解析器初始化：

1. `SAXParserFactory` / `SAXParser` / `SAXReader`
2. `DocumentBuilderFactory` / `DocumentBuilder`
3. `XMLInputFactory` / `XMLStreamReader`
4. `TransformerFactory`
5. `Unmarshaller`（JAXB）
6. `SchemaFactory` / `Validator`

## 安全检查

对每个解析器，用 `view` 检查是否配置了安全特性：

```java
// 安全配置（以下任一即可）
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
```

**未配置安全特性的 XML 解析器 = XXE 漏洞**

## 关键检查

1. 解析的 XML 数据是否来自用户输入（HTTP Body、文件上传、消息队列）
2. 是否全局禁用了 DTD
3. 是否使用了安全的解析方式（如 `JSON` 替代 `XML`）

## 输出格式

写入 `{项目名}_audit/xxe_audit/`：

```markdown
## [High] XXE - XmlParserController.parse()

**文件**：`XmlParserController.java:28`
**Sink**：`SAXReader reader = new SAXReader(); Document doc = reader.read(inputStream);`
**安全检查**：未禁用外部实体
**参数来源**：`@RequestBody InputStream inputStream`
**修复建议**：
```java
SAXReader reader = new SAXReader();
reader.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
```
```
