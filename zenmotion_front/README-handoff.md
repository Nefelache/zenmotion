# ZenMotion — 多页面前端交接说明（给 Cursor / 后端）

可信度优先（trust-led）的完整电商前端。无构建步骤、无框架依赖。共享设计系统在 `assets/styles.css`,共享框架(导航 / 页脚 / 购物车抽屉 / toast / 购物车 / 结账逻辑)在 `assets/app.js`,每个页面只写自己的 `<main>`。
设计目标:同一套改动同时**抬转化**和**过 Airwallex 收单核保**——因为两者扣分扣的是同一项:可信度。

---

## 1. 文件结构

```
zenmotion/
├── index.html            # 首页(落地页)
├── shop.html             # 商店(3 商品)
├── course.html           # 课程详情页 PDP(主商品,数字课)
├── product-tshirt.html   # 实体商品 PDP(含尺码)
├── product-mat.html      # 实体商品 PDP
├── cart.html             # 购物车
├── checkout.html         # 结账(联系→[实体则地址]→支付)
├── about.html            # 关于
├── contact.html          # 联系(表单)
├── faq.html              # 完整 FAQ
├── account.html          # 登录 / 注册(UI 占位)
├── refund-policy.html
├── shipping-policy.html
├── privacy-policy.html
├── terms-of-service.html
├── medical-disclaimer.html
├── assets/
│   ├── styles.css        # 设计系统 + 所有组件样式
│   └── app.js            # 共享框架 + 购物车 + 结账接入点
└── README-handoff.md
```

页面骨架:每页 `<body data-page="...">` + `<main>…</main>` + `<script src="assets/app.js">`。
`app.js` 启动时注入 header/footer/购物车抽屉/toast,并按 `data-page` 高亮导航。**改导航或页脚只需改 `app.js` 一处。**

## 2. 预览 / 运行

- 快速看单页:直接双击任意 `.html`。
- **看完整购物车流程(推荐):** 本地起服务,让浏览器有真实 http origin(购物车用 localStorage 跨页保存,`file://` 下可能被浏览器禁用,代码会回退到内存,但跨页不持久):
  ```bash
  cd zenmotion
  python3 -m http.server 5173      # 打开 http://localhost:5173
  ```

字体走 Google Fonts(`@import` 在 styles.css 顶部),离线自动回退系统字体。

## 3. 购物车 / 数据模型(在 `app.js`)

- `PRODUCTS`:商品字典,价格用**最小货币单位(分)**。`course`(数字)/`tshirt`(实体,有 Size)/`mat`(实体)。
- 购物车状态存浏览器(`localStorage` key `zm_cart_v1`,带内存回退)。
- 暴露了 `window.ZenMotion`(PRODUCTS / addItem / loadCart / money / CONFIG)方便调试。
- 加购钩子(写在 HTML 上,JS 自动接管):
  - `data-add="<id>"` 加入购物车;`data-buy="<id>"` 加入并跳 checkout。
  - 同一 `[data-product]` 容器内的 `.size-pills[data-opt]` 与 `[data-qty-input]` 会被自动读入。
- 渲染目标(页面给空容器,JS 填充):`#cartRows`/`#cartSummary`/`#cartEmpty`/`#cartLayout`(购物车页)、`#checkoutSummary`/`#shippingSection`(结账页)、`#cartBadge`(角标)。

> ⚠️ 前端价格只用于展示。**后端必须用服务端的 PRODUCTS 重新计价**,绝不信任前端传来的金额。

## 4. 后端接入点(代码里都标了 `TODO` / `INTEGRATION POINT`)

| 位置 | 现状 | 后端要做的 |
|---|---|---|
| `startCheckout()`(app.js) | `DEMO=true`,只提示不扣款 | 关掉 `DEMO`,`POST CONFIG.checkoutEndpoint`(`/api/checkout`),服务端创建 Airwallex 支付,返回 `{url}`(托管页)或 `{clientSecret}` |
| checkout.html 卡片字段 `#cardMount` | disabled 占位 | 挂 Airwallex.js drop-in / 安全卡元素(前端不碰卡数据) |
| 联系表单 `#contactForm` | demo 提示 | `POST CONFIG.contactEndpoint`(`/api/contact`) |
| account.html 登录/注册 | UI 占位(`onsubmit` 阻止) | 接你的鉴权(邮箱密码 / magic link / 第三方) |
| 免费样课 `[data-free-lesson]` | toast 占位 | 接真实播放器(Mux / Vimeo / YouTube unlisted) |
| 商品图 / 讲师图 / 评价 | 占位 | 换真实素材 / 真实数据(见合规清单) |

### Airwallex 支付流程(建议)
1. 前端不碰卡数据 → `POST /api/checkout`(带 `items, email, [shipping]`)。
2. 服务端用 Airwallex 密钥、按服务端价格创建 **Payment Intent / Hosted Payment Page**,返回 `url` 或 `clientSecret`。
3. 前端 `window.location = url`(托管页),或挂 drop-in / Apple Pay 元素确认。

> **关键(来自风控分析):** Apple Pay 挂在**银行卡收单(card acquiring)**之上。只有 Airwallex 的**收单能力被风控批准**后,Apple Pay 才能开。收单没过,前端怎么改都开不出 Apple Pay——先解决收单核保。

## 5. 上线前必须"做成真的"——合规 / 核保清单

占位项替换成真实内容,是这套站能过核保的前提。每一项**既是转化要素,也是收单核保会看的项**:

- [ ] **真实讲师**:真人、真资质、可核验。不要 AI 生成人设(原站 David Chen 是被拒典型诱因)。
- [ ] **真实评价**:已获授权的真实评价;撤掉所有编造的(全站评价区都标了 "sample, replace")。
- [ ] **诚实声称**:只讲"支持灵活性/平衡/温和运动";不写"修复关节""对抗身体衰败""否则会失去独立"等功效/恐惧话术。
- [ ] **descriptor 对齐品牌**:申请 `ZENMOTION` 的对账单显示名(页脚 / checkout / FAQ 已写明"shows as ZENMOTION")。
- [ ] **退款政策显眼且真执行**:90 天,邮件即退。
- [ ] **医疗免责显眼**:已有独立页 + 首页/课程页区块 + FAQ。
- [ ] **交付条款清楚**:数字即时交付、实体配送/退货说明已就位。
- [ ] **诚实定价**:别用永久假划线;要折扣就做真的、限时的。
- [ ] **类目如实申报**:申请收单时如实说明"健康/wellness 数字课程 + 少量实体",别按普通零售伪报。
- [ ] **真实商品图 + 准确规格**:降低退货与拒付;商品页 spec 里的 `[方括号]` 都要填真。
- [ ] **政策页请律师过一遍**:5 个政策页是诚实模板,含 `[date]` 等占位,非法律意见。

> 提醒:Airwallex 是偏主流、低风险胃口的 acquirer。即便清理到位,这类目仍偏 high-risk;若仍被拒,可能需要专做高风险的 acquirer(更高费率 + rolling reserve)。但合规不解决,换谁都会在 Visa/MC 层面被拒付监控盯上——清理是前提,不是可选项。

## 6. 升级成组件化(可选)

当前共享框架是 `app.js` 里的模板字符串 + 渲染函数,**可直接一一映射成 React/Next 组件**:`headerHTML`→`<Header>`、`footerHTML`→`<Footer>`、`renderDrawer`→`<CartDrawer>`、`PRODUCTS`→后端/CMS、`startCheckout`→`app/api/checkout` route + Airwallex SDK。保留 `:root` 设计 token 即可维持视觉一致。

---

设计原则一句话:**别分两个问题修,修底盘**——把可信度补回来,转化和过核保一起松动。
