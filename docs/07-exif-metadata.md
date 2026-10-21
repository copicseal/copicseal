# 07 — EXIF 元数据与相机信息

## 概述

应用自动读取照片的 EXIF 元数据，将相机参数格式化展示在最终输出的照片上。

---

## 7.1 支持的 EXIF 字段

| 字段 | 英文名 | 显示示例 |
|------|--------|----------|
| 相机制造商 | Make | SONY |
| 相机型号 | Model | ILCE-7M4 |
| 镜头型号 | LensModel | FE 24-70mm F2.8 GM II |
| 焦距 | FocalLength | 50mm |
| 光圈 | FNumber | f/2.8 |
| 快门速度 | ExposureTime | 1/250s |
| ISO | ISOSpeedRatings | 100 |
| 拍摄时间 | DateTimeOriginal | 2024-01-15 14:30:00 |
| 曝光补偿 | ExposureBias | +0.3 |
| 曝光模式 | ExposureMode | 手动曝光 |
| 白平衡 | WhiteBalance | 自动 |
| 测光模式 | MeteringMode | 点测光 |
| 方向 | Orientation | 顺时针 90° |
| 曝光程序 | ExposureProgram | 光圈优先 |
| 闪光灯 | Flash | 闪光 |
| 等效焦距 | FocalLengthIn35mmFilm | 35mm |
| 最大光圈 | MaxApertureValue | f/2.8 |
| 处理软件 | Software | Adobe Lightroom |
| 作者 | Artist | 摄影师名 |
| 版权 | Copyright | © 2026 xxx |
| 机身序列号 | BodySerialNumber | BODY12345 |
| 镜头序列号 | LensSerialNumber | LENS6789 |
| GPS 纬度 / 经度 | GPSLatitude / GPSLongitude | 31.230278°N, 121.473889°E |
| GPS 海拔 | GPSAltitude | 12.5m |

读取源说明：

- **HEIC / HIF**：这类文件的 EXIF 在 ISO-BMFF 容器里，Rust 侧的 `exif` crate 只认 JPEG/TIFF
  （直接读会报 `Exif data too large`），所以**改读导入时生成的预览**——它是全分辨率 JPEG 且保留了
  完整 EXIF（实测一张 7008×4672 的索尼 HIF：预览可读出 68 个字段、副本一个都读不出）
  - 这条链路依赖「预览能生成」：Windows 上若系统缺 HEIF 扩展，可在**设置 → 插件**安装
    libheif 插件（`heif-dec` 转码），见 `docs/15-plugin-system.md`；macOS 走系统 `sips`
- JPEG / TIFF：仍读缓存副本本身
- Web 端：直接用原始 File（exiftool 支持 HEIC/HIF），不走上面的分支

说明：

- 「EXIF 信息」卡片会列出上面**所有**字段，读不到的字段不占行；方向、曝光程序、闪光灯这类
  枚举值在界面上转成可读文案（未覆盖的取值直接显示原始数字）
- 两个读取器的口径差异要注意：桌面端用 Rust 的 `exif` crate（拿到的是**原始值**，
  `MaxApertureValue` 是 APEX，需要 `2^(APEX/2)` 换算）；Web 端用 exiftool，
  它的 `MaxApertureValue` 已经做过 ValueConv（`-n` 只关 PrintConv），拿到的就是 f 值，
  再换算一次会得到偏小的结果
- exiftool 的标签名与 EXIF 规范名可能不同（例如规范里的 `FocalLengthIn35mmFilm`，
  exiftool 叫 `FocalLengthIn35mmFormat`），Web 端映射时两个名字都试

---

## 7.2 字段映射（机型 / 品牌显示名）

设置 → 边框水印 → EXIF →「EXIF 字段映射」维护一张「原文片段 → 显示值」的表，
默认值就是内置表，用户可增删改（也可清空成「不做任何映射」）：

| 字段 | 原文 | 显示为 | 效果 |
|------|------|--------|------|
| 机型 | `ILCE-` | `α` | 所有索尼阿法共用一条，`ILCE-7M4` → `α7M4` |
| 机型 | `NIKON Z ` | `ℤ` | `NIKON Z 6` → `ℤ6` |
| 机型 | `Canon EOS` | `EOS` | 所有 EOS 机型共用一条（不写完整型号），`Canon EOS R5` → `EOS R5` |
| 机型 | `Canon` / `Digital Camera` / `PENTAX` | （留空） | 兜底删掉这些冗余前缀（非 EOS 的佳能机型等），配合 logo 那行不会出现「Canon Canon」 |
| 品牌 | `SONY` | `Sony` | |
| 品牌 | `LEICA` / `OLYMPUS` / `OM` / `NIKON` / `PANASONIC` / `PENTAX` / `RICOH` | `Leica` / `Olympus` / `Olympus` / `Nikon` / `Lumix` / `PENTAX` / `RICOH` | |
| 镜头 | —— | —— | 默认没有镜头映射 |

匹配规则：大小写不敏感、词边界优先的子串匹配，同一字段首个命中生效，「显示为」留空表示删除该片段。
替换只发生在命中的片段上、不改写其余字符，所以 `SONY CORPORATION` 会变成 `Sony CORPORATION`
（桌面端读取时 Rust 已经做过一轮品牌规范化，带公司后缀的写法主要出现在 Web 端 ExifTool 的结果里）；
`match` 里的空格是有意义的——内置的 `NIKON Z ` 就是靠末尾那个空格把 `NIKON Z 6` 收成 `ℤ6`。
映射作用于**照片上的文字**（`{Make}` / `{Model}` / `{LensModel}` 变量，以及 logo 旁的品牌/机型名）；
**不影响**导出文件里的元数据。

注意两点：

- 表是唯一口径：删掉某条内置映射，字段就恢复原样显示（`{Make}` 会重新输出 `SONY`）
- **Logo 选图不受映射影响**：品牌规范化在代码里另有一张表（`templates/brand.ts` 的 `BRAND_ALIASES`），
  把 Sony 的显示名改成「索尼」也仍会选到 `SONY.svg`；Logo 提供 PNG 与 SVG 两种格式
  - 用户自建的 Logo 走「设置 → Logo」，命中后**覆盖内置**（见 docs/03 的「品牌 Logo」一节）

内置表在两处定义、必须保持一致：Rust `config::default_exif_mappings()`（新装用户的配置默认值）
与前端 `shared/lib/exif-defaults.ts` 的 `DEFAULT_EXIF_MAPPINGS`（老配置缺键时的回落）。

---

## 7.3 EXIF 编辑

解析到的 EXIF 是底稿，用户在「EXIF 字段」卡片（边框水印页右栏）里改的值存在**改动值层**
（`useTemplateStore` 的 `modifiedExif`，按照片存），渲染与导出统一取 `解析值 ⊕ 改动值`：

| 能力 | 说明 |
|------|------|
| 补充缺失信息 | 老镜头 / 手动镜头不写 EXIF 时手填，或直接用设备档案一键套用（见 7.4） |
| 修正错误数据 | 时间、光圈、机型等写错了可直接覆盖 |
| 单字段还原 | 输入框右侧箭头：删掉该字段的改动值，回落到照片原值 |
| 全部还原 | 卡片标题栏箭头：清空这张照片的全部改动值（含设备套用进来的值） |
| 只列模板用到的字段 | 卡片只显示当前模板变量真正会用到的字段，避免出现「改了但没用到」的项 |

改动值里的**空串表示「就是要留空」**，要恢复照片原值请用还原按钮：两者语义不同。

---

## 7.4 设备档案（相机 / 镜头）

给「相机或手动镜头不记录 EXIF」的用户准备的档案库。入口是**设置 → 设备**（一级 tab），
按**相机**与**镜头**两类维护；每条档案有名字，字段自由增删（取值范围就是上面那 10 个可改写字段）。

| 组成 | 说明 |
|------|------|
| 名称 | 自定义，如「A7M4」「50mm f/1.4 手动头」 |
| 类别 | `camera` / `lens`；应用时各选一个，字段合并、**同字段镜头优先** |
| 字段 | `{ field, value }` 列表，值按 EXIF 原文填（焦距 `50`、光圈 `1.4`、快门 `1/200`）；空行保存时忽略 |

套用入口在边框水印页「EXIF 字段」卡片顶部：

| 操作 | 行为 |
|------|------|
| 应用到当前照片 | 把合并后的字段写进当前照片的改动值层 |
| 应用到全部素材 | 逐张确保 EXIF 已读（复用会话缓存），最后一次性写入；读不出来的照片按「无 EXIF」处理 |
| 仅补空（开关） | 只写当前为空的字段，保留照片真实读到的值；关掉即「覆盖」设备提到的字段（没提到的字段与手工改动保持原样） |
| 存为设备档案 | 把当前照片的 EXIF（⊕ 已有改动值）反填成一条相机 / 镜头档案，省去手抄 |

约束：

- 档案存在配置里（`config.devices`，见 docs/05 的 Devices 一节），属于本机设置，不随工作区迁移
- 套用进改动值后与手填完全等价：仍走 7.2 的显示映射与统一格式化口径，
  想原样显示机型就在映射表里删掉对应规则
- 删除或改名设备**不影响已经套用过的照片**（值已经在改动值层里）
- 没有任何可写字段时给「没有需要写入的字段」提示，不做无意义的写入

---

## 7.5 EXIF 输出策略

开关在设置 → 边框水印 → EXIF →「导出携带原图 EXIF」（默认开，存储字段是 `output.retain_exif`），
只对**模板导出**与 **JPEG** 生效：拼图导出不写元数据，PNG 也没有可写的 EXIF 段。

打开时把原图的 APP1 EXIF 段整段搬到导出文件上，但会就地纠正四处，让元数据与画面自洽：

| 处理 | 原因 |
|------|------|
| 宽高改成导出画面的实际像素（`ImageWidth` / `ImageLength` / `PixelXDimension` / `PixelYDimension`） | 原段里写的是原图尺寸，导出已经缩放/改了画幅 |
| `Orientation` 归一为 1 | 导出的像素已经是正立的，再留「顺时针 90°」会让看图软件转错 |
| IFD0 的 next-IFD 指针清零 | 指向的是**原图**的缩略图，尺寸与内容都对不上，白占十几 KB |
| `Software` 写成 `Copicseal v<应用版本>` | 标注产物来源；版本取自 `env!("CARGO_PKG_VERSION")`，与 `tauri.conf.json` / `package.json` 同源，**随版本自动变** |

`Software` 的写法不改动任何既有标签与偏移：把**新的 IFD0 追加到段尾**（原条目逐条拷贝、
只换掉 Software 那条），再改一次 TIFF 头里的 IFD0 指针。数据区、Exif SubIFD、MakerNote、
缩略图的绝对偏移都不变，因此不会被破坏；代价只是旧 IFD0 变成几十字节无人引用的垃圾。

尺寸取自导出 JPEG 自身的 SOF 帧头（不是前端传参），所以导出倍率、尺寸适配器怎么算都不会错。
段结构不认（缺 TIFF 头、类型不是 SHORT/LONG、标签不存在）时跳过对应处理，照常注入原段——
EXIF 写入失败只报警告，不影响导出本身。

Web 端走 exiftool-wasm 写回：拷贝原图标签后覆盖 `ExifImageWidth` / `ExifImageHeight` 与
`Orientation`，与桌面端同一口径。

---

## 7.6 文本模板变量

在模板的属性设置中，可以使用 EXIF 字段作为变量：

```
{FocalLength}  →  50mm
{FNumber}      →  f/2.8
{ExposureTime} →  1/250s
{ISO}          →  400
{Make}         →  SONY
{Model}        →  ILCE-7M4
{DateTaken}    →  2024:01:15 14:30:00
```

完整变量列表对应 7.1 节所有支持的 EXIF 字段。其中 GPS 也提供两个变量，按小数形式输出（6 位小数）：

```txt
{Latitude}   →  31.230416°N
{Longitude}  →  121.473701°E
```

小数后面带半球字母（N/S、E/W），与「EXIF 信息」卡片里的展示口径一致。三种口径由设置决定：

| 设置 | 可选值 | 例子 |
|------|--------|------|
| 拍摄时间格式 | 默认 `YYYY-MM-DD HH:mm:ss`；占位符 `YYYY YY MM M DD D HH H mm m ss s`，其余字符原样保留 | `YYYY年MM月DD日 HH:mm` → `2024年01月15日 14:30` |
| 经纬度格式 | 度数+字母 / 度数+中文（度分秒，秒四舍五入并处理进位） | `31.230278°N` / `北纬 31°13'49"` |
| 焦段 | 实际焦距 / 等效 35mm | `{FocalLength}` → `122mm` / `88mm` |

两个读取器给的时间写法不同（Rust 侧 `2024-01-15 14:30:00`，ExifTool `2024:01:15 14:30:00`），
格式化时会先统一解析（容忍 `T` 分隔、子秒、时区后缀）；**解析不出来就原样输出**，不吞掉内容。

它们与其它变量一样：既能写进模板文案、也能在「EXIF 字段」卡片里改写（改动值按字符串存，
渲染时再转回数值，空串或非法输入按清空处理）。
