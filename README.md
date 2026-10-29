# 🪐 OpenXCircle

<div align="center">

**新一代开源 X (Twitter) 互动社交圈生成器 · 100% 纯前端 · 零后端依赖 · 永久免费**

[![Deploy to GitHub Pages](https://github.com/xiuN1ng/OpenXCircle/actions/workflows/deploy.yml/badge.svg)](https://github.com/xiuN1ng/OpenXCircle/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework: React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Local-First](https://img.shields.io/badge/Security-100%25%20Local--First-emerald.svg)](#-隐私与安全承诺)

[🚀 在线体验 Demo](https://xiun1ng.github.io/OpenXCircle/) · [✨ 核心亮点](#-超越同类工具的核心亮点) · [📦 本地归档解析](#-离线数据包拖拽解析) · [⚡ 一键部署](#-一键部署至-github-pages)

</div>

---

## 🌟 为什么做 OpenXCircle？

市面上的推特互动圈工具（如 NekoCircle 等）普遍存在几个痛点：
1. **依赖私有云服务器与数据库**：必须运行 Node.js + SQLite，无法直接发布在 GitHub Pages 等纯静态免费托管平台；
2. **需要中心化账号中转**：很多方案依赖作者个人的 Cloudflare / 爬虫服务器，配额耗尽或被封控就全部瘫痪；
3. **表现形态单一**：只有同心圆轨道，缺乏深度的社交关系诊断；
4. **历史数据较浅**：实时爬虫只能查到过去十几天的少量公开推文。

**`OpenXCircle` 从底层重构了这一切！** 坚持 **Pure Local-First Open Source（纯本地优先开源）**，代码零私有账号绑定，任何人 Fork 就能在 GitHub Pages 上直接上线！

---

## ✨ 超越同类工具的核心亮点

### 1. 🪐 多重视觉形态呈现
* **经典宇宙轨道圈（Cosmic Orbit）**：动态粒子星海、行星自转与公转、同心圆发光轨道，支持 2 圈/3 圈自由切换。
* **好友段位金字塔（Tier List）**：按加权互动分自动划分 **S 级核心死党**、**A 级深度好友**、**B 级常客** 与 **C 级点赞之交**。
* **社交关系深度洞察（Social Insights）**：
  * **互撩天平**：清晰透视“双向奔赴圈”、“死忠守护圈（对方互动多）”与“默默关注圈（你互动多）”；
  * **社交画像标签云**：自动提炼圈内推友的互动性格（如“深夜畅聊”、“深度同频”、“死忠转推”）。

### 2. 🛡️ 100% 隐私安全的本地归档拖拽解析（杀手级功能）
* 用户可直接拖入从 X 导出的官方数据包（`.zip` 或 `tweets.js`）；
* 浏览器本地通过 Web Worker 计算，不把压缩包上传到服务器；
* **真正本地解析**：推文不会离开浏览器。归档头像用首字母，避免把用户名发给头像代理；
* **全量历史无损**：不仅看最近几天，还能一览你注册 10 年来的真实本命圈！

### 3. 🌐 去中心化免登录在线查询
* 在线查询走项目自建的 Cloudflare Worker（`openxcircle-proxy.xiuningkou.workers.dev`），不是公共代理池。Fork 后若要在线查询，需要换成你自己的中继；
* 输入推特 Handle 即可一键生成。归档导入不依赖这个中继。

### 4. 🎨 4K 超清海报导出（防跨域污染）
* 导出会先等头像加载完再画，避免海报只有首字母；跨域失败的头像会退回首字母，不会把画布弄脏；
* 支持导出 **1:1 推文方形图**、**9:16 手机壁纸长图** 与 **16:9 电脑宽屏**。

---

## 🚀 极速本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/OpenXCircle.git
cd OpenXCircle

# 2. 安装依赖
npm install

# 3. 启动本地开发服务
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始体验。

---

## ⚡ 一键部署至 GitHub Pages

本项目已经内置了自动部署流水线（`.github/workflows/deploy.yml`）：

1. 点击本仓库右上角 **Fork** 到你的 GitHub 账号；
2. 进入你的仓库设置 **Settings** ➔ **Pages**；
3. 在 **Build and deployment** ➔ **Source** 下拉菜单中选择 **GitHub Actions**；
4. 随后推送到 `main` 分支的每一次提交都会自动触发全球 CDN 部署；
5. 几秒钟后，你的专属站点将在 `https://<你的用户名>.github.io/OpenXCircle/` 自动上线！

---

## 🔒 隐私与安全承诺

* **绝不上传推文数据**：无论是在线查询还是拖入归档包，所有数据处理与图表渲染均在您的浏览器本地沙箱中完成；
* **零追踪、零 Cookie、零数据库**。

---

## 📄 开源许可证

本项目采用 [MIT 许可证](LICENSE)，欢迎自由修改、学习或用于个人运营。
