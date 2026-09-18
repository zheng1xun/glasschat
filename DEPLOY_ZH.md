# 琉璃 GlassChat — 自用部署指南（中文）

基于 [EvanBacon/chat-template](https://github.com/EvanBacon/chat-template) 改造：Expo + iOS 26 液态玻璃，**直连 DeepSeek（或任何 OpenAI 兼容接口）**，无需自己的服务器。Windows 上开发，GitHub Actions 云端编译 IPA，SideStore 侧载到 iPhone。

相对上游模板改了这些：

- 新增 `src/lib/openai-compat-transport.ts` —— 设备端直连 OpenAI 兼容接口的流式传输层（SSE 解析，支持 `reasoning_content` 思考过程）
- 新增 `src/lib/api-config.ts` —— API Key / 地址 / 模型存本机钥匙串（expo-secure-store）
- 设置页改为真实的接口配置界面；聊天页加了错误提示条
- 应用名「琉璃 GlassChat」，包名 `com.glasschat.app`，玻璃球图标
- 新增 `.github/workflows/build-ios.yml` —— 云端编译未签名 IPA

## 前提

1. **iPhone 需 iOS 26**（液态玻璃是 iOS 26 系统材质）
2. GitHub 账号（公开仓库 Actions 免费）
3. Windows 上装 SideStore 用来装 IPA（免费 Apple ID 即可）

## 三步上线

### 1. 推到 GitHub

```bash
cd chat-template
git init
git add .
git commit -m "GlassChat: DeepSeek direct + liquid glass"
gh repo create glasschat --public --source=. --push
```

### 2. 云端编译 IPA

push 到 `main` 自动触发，也可在 **Actions → build-ios → Run workflow** 手动跑。
约 15–25 分钟（RN 工程比纯 SwiftUI 重），完成后在运行记录底部下载 `GlassChat-ipa` 解压出 `GlassChat.ipa`。

> 如果报 `macos-26` 找不到，把 `.github/workflows/build-ios.yml` 里 `runs-on` 改成 `macos-15`。

### 3. SideStore 侧载

1. Windows 安装**苹果官网版** iCloud + iTunes（非微软商店版），再从 [sidestore.io](https://sidestore.io) 装 SideStore（手机需连线一次）。
2. `GlassChat.ipa` 传到手机，SideStore 里点 `+` 选择安装，登录 Apple ID 签名。
3. 打开「琉璃」→ 右上角进设置 → 填 DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com/api_keys) 申请）→ 开聊。

免费证书 7 天到期，SideStore 在同一 Wi-Fi 下自动续签；想省心可买 $99/年开发者账号走 TestFlight。

## 日常使用 / 调试

- **改模型**：App 内设置页选 `deepseek-chat` / `deepseek-reasoner`，或填任意自定义模型名。
- **换接口**：设置页改 API 地址到任何 OpenAI 兼容服务（地址到 `/v1` 一级）。
- **本地预览 UI**（不编 iOS）：`bun install` 后 `bun run web` 在浏览器里看整体界面；设 `EXPO_PUBLIC_MOCK_AI=1` 可用假数据调试。
- **改了代码**：push 一下 Actions 就出新 IPA，SideStore 重装即更新。

## 排错

- **CI 编译失败**：把 Actions 里失败步骤的红色日志发给我，直接改。
- **装上打不开**：设置 → 通用 → VPN与设备管理 → 信任你的 Apple ID。
- **聊天报错**：错误信息会显示在输入框上方的红色提示条里，照着改设置即可。
