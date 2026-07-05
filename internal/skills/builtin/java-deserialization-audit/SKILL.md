---
name: java-deserialization-audit
description: Java 反序列化漏洞检测。扫描 ObjectInputStream、Fastjson、Jackson、Hessian、JNDI 等反序列化 Sink，检查 classpath 中的 gadget 链。
user-invocable: true
---

# Java 反序列化审计

检测 Java 项目中的不安全反序列化漏洞。

## 检测 Sink

用 `grep` 搜索以下模式（`.java` 文件）：

### 原生反序列化
- `ObjectInputStream` + `readObject(`
- `XMLDecoder`
- `Serializable` + `readResolve(`

### Fastjson
- `JSON.parseObject(` / `JSON.parse(`
- `@type` 字段（AutoType 开启时危险）
- 检查 Fastjson 版本：< 1.2.83 存在已知绕过

### Jackson
- `ObjectMapper.readValue(` + `enableDefaultTyping(`
- `@JsonTypeInfo(use = Id.CLASS)`
- `PolymorphicTypeValidator` 未配置

### Hessian
- `HessianInput.readObject(`
- `Hessian2Input.readObject(`

### JNDI 注入
- `InitialContext(` + `lookup(`
- `JndiTemplate.lookup(`
- `JndiLocatorDelegate.lookup(`

## Gadget 链检查

用 `grep` 搜索 pom.xml / build.gradle 中的危险依赖：
- `commons-collections` (3.x)
- `commons-beanutils`
- `c3p0`
- `spring-core` + `spring-beans`
- `xalan`
- `groovy`
- `bsh` (BeanShell)

## 调用链验证

对每个 Sink：
1. 确认输入来源：是否接收用户可控数据（HTTP Body、Cookie、消息队列）
2. 检查是否有 `ObjectInputFilter` / `ValidatingObjectInputStream` 防护
3. 检查 classpath 是否包含已知 gadget

## 输出格式

写入 `{项目名}_audit/deserialization_audit/`：

```markdown
## [Critical] Fastjson 反序列化 - ApiController.parse()

**文件**：`ApiController.java:28`
**Sink**：`JSON.parseObject(request.getBody(), Object.class)`
**版本**：fastjson 1.2.68（存在 AutoType 绕过）
**Gadget**：classpath 含 commons-collections 3.2.1
**调用链**：`Controller.parse() → Service.process()`
**修复建议**：升级 fastjson 到 2.x，或启用 SafeMode
```
