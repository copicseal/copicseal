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
{ISO}          →  ISO 100
{Make}         →  SONY
{Model}        →  ILCE-7M4
{DateTimeOriginal} → 2024-01-15
```

完整变量列表对应 7.1 节所有支持的 EXIF 字段。
