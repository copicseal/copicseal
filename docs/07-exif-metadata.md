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

内置表在两处定义、必须保持一致：Rust `config::default_exif_mappings()`（新装用户的配置默认值）
与前端 `shared/lib/exif-defaults.ts` 的 `DEFAULT_EXIF_MAPPINGS`（老配置缺键时的回落）。

---

## 7.3 EXIF 编辑

用户可以修改 EXIF 中的字段值：

| 场景 | 说明 |
|------|------|
| 补充缺失信息 | 某些老镜头不传 EXIF，用户可手动填写 |
| 修正错误数据 | 时间、光圈等如不正确可修正 |
| 自定义相机信息 | 手动镜头、改装相机等 |

---

## 7.4 用户设备数据库

用户可将自己的相机/镜头信息添加到本地数据库：

| 信息 | 说明 |
|------|------|
| 设备名称 | 自定义显示名称 |
| 设备类型 | 相机 / 镜头 |
| EXIF 覆盖值 | 自定义的元数据字段 |

用途：老镜头无电子触点时，手动关联 EXIF 信息。

---

## 7.5 EXIF 输出策略

开关在设置 → 边框水印 → EXIF →「导出携带原图 EXIF」（默认开，存储字段是 `output.retain_exif`），
只对**模板导出**与 **JPEG** 生效：拼图导出不写元数据，PNG 也没有可写的 EXIF 段。

打开时把原图的 APP1 EXIF 段整段搬到导出文件上，但会就地纠正三处，让元数据与画面自洽：

| 处理 | 原因 |
|------|------|
| 宽高改成导出画面的实际像素（`ImageWidth` / `ImageLength` / `PixelXDimension` / `PixelYDimension`） | 原段里写的是原图尺寸，导出已经缩放/改了画幅 |
| `Orientation` 归一为 1 | 导出的像素已经是正立的，再留「顺时针 90°」会让看图软件转错 |
| IFD0 的 next-IFD 指针清零 | 指向的是**原图**的缩略图，尺寸与内容都对不上，白占十几 KB |

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
