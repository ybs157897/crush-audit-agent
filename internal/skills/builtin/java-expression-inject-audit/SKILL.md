---
name: java-expression-inject-audit
description: Java 表达式/模板注入检测。扫描 OGNL、SpEL、MVEL、FreeMarker、Velocity 等 10+ 引擎的注入 Sink，检测表达式注入和沙箱绕过。
user-invocable: true
---

# Java 表达式注入审计

检测 Java 项目中的表达式注入和模板引擎注入漏洞。

## 检测 Sink

用 `grep` 搜索以下模式：

### OGNL（Struts2）
- `OgnlUtil.getValue(`, `Ognl.getValue(`
- `ValueStack.findValue(`, `ValueStack.setValue(`
- `#context`, `#request`, `#session`

### SpEL（Spring）
- `SpelExpressionParser(`, `ExpressionParser.parseExpression(`
- `StandardEvaluationContext` + `setVariable(`
- `@Value("#{...}")`（用户可控时危险）

### MVEL
- `MVEL.eval(`, `MVEL.compileExpression(`

### FreeMarker
- `new Template(`, `Template.process(`
- `<#assign>`, `<#include>`（用户可控路径时危险）
- `freemarker.template.utility.Execute`

### Velocity
- `VelocityEngine.evaluate(`
- `Velocity.evaluate(`

### Thymeleaf
- `th:text="${...}"`, `th:utext="${...}"`（变量来自用户输入时）
- `__${...}__`（预处理表达式）

### JEXL / EL
- `JexlEngine.createExpression(`
- `ExpressionFactory.createValueExpression(`

## 关键检查

1. 表达式字符串是否包含用户输入
2. 是否使用了沙箱（`SandboxedEvaluation`、`SecureUberspector`）
3. 是否限制了可调用的类/方法

## 输出格式

写入 `{项目名}_audit/expr_inject_audit/`：

```markdown
## [Critical] SpEL 注入 - TemplateController.render()

**文件**：`TemplateController.java:42`
**Sink**：`parser.parseExpression(userInput).getValue(context)`
**参数来源**：`@RequestParam("expr") String userInput`
**影响**：可执行任意 Java 代码（Runtime.exec）
**修复建议**：使用 `SimpleEvaluationContext` 替代 `StandardEvaluationContext`
```
