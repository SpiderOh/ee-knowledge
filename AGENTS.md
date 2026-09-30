# AGENTS.md

本文件用于约束所有参与本项目的 AI Agent 和开发者。

## 开始任务前

必须阅读：

1. `docs/MASTER_SPEC.md`
2. `docs/PROJECT_STATUS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/DECISIONS.md`
6. `README.md`

然后检查：

- `package.json`
- `prisma/schema.prisma`
- 相关模块
- 最近 Git 变更（如果可用）

## 强制规则

1. 不要重新创建已经存在的项目。
2. 不要无理由更换技术栈。
3. 不要把专业知识正文写死在 React 组件中。
4. KnowledgePoint 是核心业务实体。
5. Book 与 KnowledgePoint 通过关联表建立关系。
6. 数据库变更必须有 migration。
7. 不得通过删除数据来解决程序问题。
8. 不要关闭 TypeScript 检查来绕过错误。
9. 不得大量使用 `any`。
10. AI 服务必须通过 Provider 抽象层调用。
11. 不得让业务代码直接依赖某一家 AI 厂商 SDK。
12. 新功能优先复用已有组件与服务。
13. 不要重写与当前任务无关的模块。
14. 修改公共接口时必须检查调用方。
15. 重大架构决策写入 `docs/DECISIONS.md`。
16. 完成任务后更新 `docs/PROJECT_STATUS.md`。
17. 新增用户可见功能后更新 `docs/CHANGELOG.md`。
18. 优先保护用户数据和向后兼容性。

## 一个任务的标准流程

```text
阅读文档
→ 阅读相关代码
→ 分析依赖
→ 说明方案
→ 实现
→ 类型检查
→ 测试
→ 构建
→ 更新文档
```

## 完成任务后的汇报格式

必须给出：

- 实现了什么
- 修改了哪些文件
- 新增了哪些文件
- 数据库是否变更
- 测试结果
- 已知问题
- 下一步建议

## 禁止行为

- 为了修复一个小 Bug 直接重写整个模块。
- 在没有迁移策略时删除数据库字段。
- 在 UI 文件中塞入大量业务逻辑。
- 在多个页面重复写相同的数据访问逻辑。
- 为“未来可能用到”而过度设计。
- 在没有真实需求时引入微服务、Redis、Kubernetes、ElasticSearch 等复杂基础设施。
