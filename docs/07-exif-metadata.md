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

## 7.2 相机品牌映射

不同品牌相机自动格式化显示并匹配 Logo：

| 品牌 | 原始型号示例 | 格式化显示 | Logo |
|------|-------------|-----------|------|
| Sony | ILCE-7M4 | α7M4 | α 符号 |
| Nikon | NIKON Z 6 | ℤ 6 | ℤ 符号 |
| Canon | Canon EOS R5 | Canon EOS R5 | Canon Logo |
| Leica | LEICA Q2 | LEICA Q2 | Leica Logo |
| Olympus | E-M1MarkII | E-M1MarkII | Olympus Logo |
| Pentax | PENTAX K-1 | PENTAX K-1 | Pentax Logo |
| RICOH | RICOH GR III | RICOH GR III | RICOH Logo |

Logo 提供 PNG 和 SVG 两种格式。

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

导出时的 EXIF 保留策略：

| 保留 | 过滤 |
|------|------|
| 相机参数（型号、参数） | 文件系统信息 |
| 拍摄时间 | 缩略图数据 |
| GPS 信息 | 方向信息 |
| DPI 分辨率 | 内部尺寸字段 |

用户可在设置中开关 "保留 EXIF" 选项，关闭后导出文件将不包含任何元数据。

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

小数后面带半球字母（N/S、E/W），与「EXIF 信息」卡片里的展示口径一致。

它们与其它变量一样：既能写进模板文案、也能在「EXIF 字段」卡片里改写（改动值按字符串存，
渲染时再转回数值，空串或非法输入按清空处理）。
