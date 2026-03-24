# MewChat

基于 Vite + Vue 3 + Tailwind CSS 的纯前端聊天界面，通过 OpenAI 兼容的 `POST /v1/chat/completions` 调用自定义 API。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 说明

- 点击「模型配置」在弹窗中填写 **Base URL**、**API Key**、**Model**；设置会保存在浏览器 `localStorage`。
- 从浏览器直连第三方 API 时，目标服务必须允许当前页面的来源（**CORS**）。若出现跨域错误，需使用支持浏览器来源的网关或代理；勿将密钥提交到公开仓库。
