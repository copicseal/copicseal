use serde::Serialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

#[derive(Debug, Serialize, Clone, Default)]
pub struct ExifData {
    pub make: Option<String>,
    pub model: Option<String>,
    pub lens_model: Option<String>,
    pub aperture: Option<String>,
    pub shutter_speed: Option<String>,
    pub iso: Option<String>,
    pub focal_length: Option<String>,
    pub exposure_compensation: Option<String>,
    pub date_taken: Option<String>,
    pub white_balance: Option<String>,
    pub metering_mode: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub image_width: Option<u32>,
    pub image_height: Option<u32>,
    /// 方向（1 = 正常，3 = 旋转 180°，6 = 顺时针 90°，8 = 逆时针 90° …）
    pub orientation: Option<u32>,
    /// 曝光程序（1 = 手动，2 = 程序自动，3 = 光圈优先，4 = 快门优先 …）
    pub exposure_program: Option<u32>,
    /// 闪光灯（EXIF 位掩码：0 = 未闪光，1 = 闪光，5 = 闪光但未检测到回光 …）
    pub flash: Option<u32>,
    pub focal_length_35mm: Option<u32>,
    pub max_aperture: Option<String>,
    pub software: Option<String>,
    pub artist: Option<String>,
    pub copyright: Option<String>,
    pub body_serial: Option<String>,
    pub lens_serial: Option<String>,
    pub gps_altitude: Option<f64>,
}

fn aperture_display(fnumber: f64) -> String {
    format!("f/{:.1}", fnumber)
}

fn shutter_display(seconds: f64) -> String {
    if seconds >= 1.0 {
        format!("{:.0}s", seconds)
    } else if seconds > 0.0 {
        format!("1/{:.0}s", 1.0 / seconds)
    } else {
        "0s".to_string()
    }
}

fn focal_length_display(mm: f64) -> String {
    format!("{:.0}mm", mm)
}

fn exposure_comp_display(ev: f64) -> String {
    if ev == 0.0 {
        "0 EV".to_string()
    } else if ev > 0.0 {
        format!("+{:.1} EV", ev)
    } else {
        format!("{:.1} EV", ev)
    }
}

fn rational_to_f64(r: &exif::Rational) -> f64 {
    r.num as f64 / r.denom as f64
}

fn srational_to_f64(r: &exif::SRational) -> f64 {
    r.num as f64 / r.denom as f64
}

/// 清理 `display_value()` 的文本表示。
///
/// `DisplayValue` 对 ASCII 字段使用 Debug 格式化，取出来会自带一对表示字符串
/// 字面量的双引号；原始值也可能以 NUL 结尾。这里统一剥掉外层引号并去除首尾的
/// NUL 与空白，保证品牌、型号、日期等字段拿到的是可直接展示与拼接的文本。
fn clean_display(raw: &str) -> String {
    let trimmed = raw.trim();
    let unquoted = if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        &trimmed[1..trimmed.len() - 1]
    } else {
        trimmed
    };

    unquoted
        .trim_matches(|c: char| c == '\0' || c.is_whitespace())
        .to_string()
}

fn normalize_brand(raw: &str) -> String {
    let lower = raw.trim().to_lowercase();
    match lower.as_str() {
        s if s.starts_with("sony") => "Sony".into(),
        s if s.starts_with("canon") => "Canon".into(),
        s if s.starts_with("nikon") => "Nikon".into(),
        s if s.starts_with("fujifilm") => "Fujifilm".into(),
        s if s.starts_with("olympus") => "Olympus".into(),
        s if s.starts_with("panasonic") => "Panasonic".into(),
        s if s.starts_with("leica") => "Leica".into(),
        s if s.starts_with("ricoh") => "Ricoh".into(),
        s if s.starts_with("pentax") => "Pentax".into(),
        s if s.starts_with("sigma") => "Sigma".into(),
        s if s.starts_with("hasselblad") => "Hasselblad".into(),
        s if s.starts_with("samsung") => "Samsung".into(),
        s if s.starts_with("apple") => "Apple".into(),
        s if s.starts_with("google") => "Google".into(),
        s if s.starts_with("huawei") => "Huawei".into(),
        s if s.starts_with("xiaomi") => "Xiaomi".into(),
        s if s.starts_with("dji") => "DJI".into(),
        s if s.starts_with("gopro") => "GoPro".into(),
        s if s.starts_with("insta360") => "Insta360".into(),
        s if s.starts_with("oneplus") => "OnePlus".into(),
        s if s.starts_with("oppo") => "OPPO".into(),
        s if s.starts_with("vivo") => "vivo".into(),
        s if s.starts_with("nokia") => "Nokia".into(),
        s if s.starts_with("zeiss") => "Zeiss".into(),
        _ => {
            let mut chars = raw.trim().chars();
            match chars.next() {
                None => raw.to_string(),
                Some(c) => c.to_uppercase().to_string() + chars.as_str(),
            }
        }
    }
}

#[tauri::command]
pub fn read_exif(path: String) -> Result<ExifData, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    let file = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut reader = BufReader::new(file);

    let exif_reader = exif::Reader::new();
    let exif = exif_reader
        .read_from_container(&mut reader)
        .map_err(|e| format!("EXIF 解析失败: {}", e))?;

    let mut data = ExifData::default();
    // GPS 的「值」与「参考方向（N/S、E/W）」是两个字段，遍历顺序不保证，所以先收集、循环后再定符号
    let mut gps_latitude: Option<f64> = None;
    let mut gps_latitude_ref: Option<bool> = None;
    let mut gps_longitude: Option<f64> = None;
    let mut gps_longitude_ref: Option<bool> = None;

    for field in exif.fields() {
        match field.tag {
            exif::Tag::Make
            | exif::Tag::Model
            | exif::Tag::LensModel
            | exif::Tag::DateTimeOriginal
            | exif::Tag::WhiteBalance
            | exif::Tag::MeteringMode
            | exif::Tag::Software
            | exif::Tag::Artist
            | exif::Tag::Copyright
            | exif::Tag::BodySerialNumber
            | exif::Tag::LensSerialNumber => {
                let val = clean_display(&field.display_value().to_string());
                if !val.is_empty() {
                    match field.tag {
                        exif::Tag::Make => data.make = Some(normalize_brand(&val)),
                        exif::Tag::Model => data.model = Some(val),
                        exif::Tag::LensModel => data.lens_model = Some(val),
                        exif::Tag::DateTimeOriginal => data.date_taken = Some(val),
                        exif::Tag::WhiteBalance => data.white_balance = Some(val),
                        exif::Tag::MeteringMode => data.metering_mode = Some(val),
                        exif::Tag::Software => data.software = Some(val),
                        exif::Tag::Artist => data.artist = Some(val),
                        exif::Tag::Copyright => data.copyright = Some(val),
                        exif::Tag::BodySerialNumber => data.body_serial = Some(val),
                        exif::Tag::LensSerialNumber => data.lens_serial = Some(val),
                        _ => {}
                    }
                }
            }
            exif::Tag::FNumber => {
                if let exif::Value::Rational(v) = &field.value {
                    if let Some(r) = v.first() {
                        data.aperture = Some(aperture_display(rational_to_f64(r)));
                    }
                }
            }
            exif::Tag::ExposureTime => {
                if let exif::Value::Rational(v) = &field.value {
                    if let Some(r) = v.first() {
                        data.shutter_speed = Some(shutter_display(rational_to_f64(r)));
                    }
                }
            }
            exif::Tag::PhotographicSensitivity => {
                if let exif::Value::Short(v) = &field.value {
                    if let Some(val) = v.first() {
                        data.iso = Some(val.to_string());
                    }
                }
            }
            exif::Tag::FocalLength => {
                if let exif::Value::Rational(v) = &field.value {
                    if let Some(r) = v.first() {
                        data.focal_length = Some(focal_length_display(rational_to_f64(r)));
                    }
                }
            }
            exif::Tag::ExposureBiasValue => {
                if let exif::Value::SRational(v) = &field.value {
                    if let Some(r) = v.first() {
                        data.exposure_compensation =
                            Some(exposure_comp_display(srational_to_f64(r)));
                    }
                }
            }
            exif::Tag::PixelXDimension => {
                if let exif::Value::Long(v) = &field.value {
                    if let Some(val) = v.first() {
                        data.image_width = Some(*val);
                    }
                }
            }
            exif::Tag::PixelYDimension => {
                if let exif::Value::Long(v) = &field.value {
                    if let Some(val) = v.first() {
                        data.image_height = Some(*val);
                    }
                }
            }
            exif::Tag::Orientation => {
                if let exif::Value::Short(v) = &field.value {
                    data.orientation = v.first().map(|val| u32::from(*val));
                }
            }
            exif::Tag::ExposureProgram => {
                if let exif::Value::Short(v) = &field.value {
                    data.exposure_program = v.first().map(|val| u32::from(*val));
                }
            }
            exif::Tag::Flash => {
                if let exif::Value::Short(v) = &field.value {
                    data.flash = v.first().map(|val| u32::from(*val));
                }
            }
            exif::Tag::FocalLengthIn35mmFilm => {
                if let exif::Value::Short(v) = &field.value {
                    data.focal_length_35mm = v.first().map(|val| u32::from(*val));
                }
            }
            exif::Tag::MaxApertureValue => {
                // 同样是 APEX 值：f = 2^(APEX/2)
                let apex = match &field.value {
                    exif::Value::Rational(v) => v.first().map(rational_to_f64),
                    exif::Value::SRational(v) => v.first().map(srational_to_f64),
                    _ => None,
                };
                if let Some(apex) = apex {
                    data.max_aperture = Some(aperture_display(2f64.powf(apex / 2.0)));
                }
            }
            exif::Tag::GPSLatitude => {
                gps_latitude = gps_dms_to_decimal(&field.value);
            }
            exif::Tag::GPSLatitudeRef => {
                gps_latitude_ref = gps_ref_is_north(&field.value);
            }
            exif::Tag::GPSLongitude => {
                gps_longitude = gps_dms_to_decimal(&field.value);
            }
            exif::Tag::GPSLongitudeRef => {
                gps_longitude_ref = gps_ref_is_north(&field.value);
            }
            exif::Tag::GPSAltitude => {
                if let exif::Value::Rational(v) = &field.value {
                    data.gps_altitude = v.first().map(rational_to_f64);
                }
            }
            _ => {}
        }
    }

    data.latitude = match (gps_latitude, gps_latitude_ref) {
        (Some(value), Some(is_north)) => Some(if is_north { value } else { -value }),
        _ => None,
    };
    data.longitude = match (gps_longitude, gps_longitude_ref) {
        (Some(value), Some(is_east)) => Some(if is_east { value } else { -value }),
        _ => None,
    };

    Ok(data)
}

/// 度分秒（三个 Rational）换算成十进制度数。
fn gps_dms_to_decimal(value: &exif::Value) -> Option<f64> {
    let parts = match value {
        exif::Value::Rational(v) => v,
        _ => return None,
    };

    let mut iter = parts.iter();
    let degrees = rational_to_f64(iter.next()?);
    let minutes = iter.next().map(rational_to_f64).unwrap_or(0.0);
    let seconds = iter.next().map(rational_to_f64).unwrap_or(0.0);

    Some(degrees + minutes / 60.0 + seconds / 3600.0)
}

/// 参考方向是 ASCII：N/E 为正，S/W 为负（大小写不敏感）。
fn gps_ref_is_north(value: &exif::Value) -> Option<bool> {
    let text = match value {
        exif::Value::Ascii(v) => v.first().map(|bytes| {
            String::from_utf8_lossy(bytes)
                .trim_matches(|c: char| c == '\0' || c.is_whitespace())
                .to_uppercase()
        }),
        _ => None,
    }?;

    Some(text.starts_with('N') || text.starts_with('E'))
}

#[tauri::command]
pub fn extract_jpeg_exif(path: String) -> Result<Vec<u8>, String> {
    let data = std::fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    if data.len() < 2 || data[0] != 0xFF || data[1] != 0xD8 {
        return Err("不是有效的 JPEG 文件".into());
    }

    let mut pos = 2;
    while pos + 3 < data.len() {
        if data[pos] != 0xFF {
            return Err("JPEG 格式错误".into());
        }
        let marker = data[pos + 1];
        if marker == 0xE1 {
            let len = ((data[pos + 2] as usize) << 8) | (data[pos + 3] as usize);
            if pos + 2 + len <= data.len() {
                return Ok(data[pos..pos + 2 + len].to_vec());
            }
        }
        if marker == 0xDA || marker == 0xD9 {
            break;
        }
        let seg_len = ((data[pos + 2] as usize) << 8) | (data[pos + 3] as usize);
        pos += 2 + seg_len;
    }

    Err("未找到 EXIF 数据".into())
}

/// 把 EXIF 段插到 JPEG 的 SOI 之后。
///
/// `align_dimensions` 为真时（导出场景）先按导出画面的实际像素改写段里的宽高、
/// 把朝向归一为 1 并丢掉原图缩略图——原段是从原图搬来的，尺寸与缩略图都对不上。
#[tauri::command]
pub fn insert_jpeg_exif(
    jpeg_data: Vec<u8>,
    exif_segment: Vec<u8>,
    align_dimensions: bool,
) -> Result<Vec<u8>, String> {
    if jpeg_data.len() < 2 || jpeg_data[0] != 0xFF || jpeg_data[1] != 0xD8 {
        return Err("不是有效的 JPEG 数据".into());
    }

    let mut segment = exif_segment;
    if align_dimensions {
        if let Some((width, height)) = jpeg_frame_size(&jpeg_data) {
            let patched = align_exif_segment(&mut segment, width, height);
            if patched == 0 {
                println!("EXIF 段没有可对齐的尺寸标签，按原样注入");
            }
        }

        // 导出产物统一标注生成工具与版本（版本号跟随 Cargo.toml，与 tauri.conf.json 同源）
        let software = format!("Copicseal v{}", env!("CARGO_PKG_VERSION"));
        if !write_software_tag(&mut segment, &software) {
            println!("EXIF 段里写不进 Software 标签，按原样注入");
        }
    }

    let mut result = Vec::with_capacity(jpeg_data.len() + segment.len());
    result.extend_from_slice(&jpeg_data[..2]);
    result.extend_from_slice(&segment);
    result.extend_from_slice(&jpeg_data[2..]);

    Ok(result)
}

// ---------------------------------------------------------------------------
// 导出时的 EXIF 对齐
// ---------------------------------------------------------------------------

const TIFF_TAG_IMAGE_WIDTH: u16 = 0x0100;
const TIFF_TAG_IMAGE_LENGTH: u16 = 0x0101;
const TIFF_TAG_ORIENTATION: u16 = 0x0112;
const TIFF_TAG_EXIF_IFD: u16 = 0x8769;
const TIFF_TAG_PIXEL_X_DIMENSION: u16 = 0xA002;
const TIFF_TAG_PIXEL_Y_DIMENSION: u16 = 0xA003;
const TIFF_TYPE_SHORT: u16 = 3;
const TIFF_TYPE_LONG: u16 = 4;

fn read_u16(bytes: &[u8], offset: usize, big_endian: bool) -> Option<u16> {
    let slice = bytes.get(offset..offset + 2)?;
    Some(if big_endian {
        u16::from_be_bytes([slice[0], slice[1]])
    } else {
        u16::from_le_bytes([slice[0], slice[1]])
    })
}

fn read_u32(bytes: &[u8], offset: usize, big_endian: bool) -> Option<u32> {
    let slice = bytes.get(offset..offset + 4)?;
    let raw = [slice[0], slice[1], slice[2], slice[3]];
    Some(if big_endian {
        u32::from_be_bytes(raw)
    } else {
        u32::from_le_bytes(raw)
    })
}

fn write_u16(bytes: &mut [u8], offset: usize, value: u16, big_endian: bool) -> bool {
    let raw = if big_endian {
        value.to_be_bytes()
    } else {
        value.to_le_bytes()
    };
    match bytes.get_mut(offset..offset + 2) {
        Some(slice) => {
            slice.copy_from_slice(&raw);
            true
        }
        None => false,
    }
}

fn write_u32(bytes: &mut [u8], offset: usize, value: u32, big_endian: bool) -> bool {
    let raw = if big_endian {
        value.to_be_bytes()
    } else {
        value.to_le_bytes()
    };
    match bytes.get_mut(offset..offset + 4) {
        Some(slice) => {
            slice.copy_from_slice(&raw);
            true
        }
        None => false,
    }
}

/// APP1 段里 TIFF 头的起始位置（跳过 `Exif\0\0` 标识）。
fn tiff_start(segment: &[u8]) -> Option<usize> {
    let marker = segment.windows(6).position(|w| w == b"Exif\0\0")?;
    Some(marker + 6)
}

const TIFF_TAG_SOFTWARE: u16 = 0x0131;
const TIFF_TYPE_ASCII: u16 = 2;

fn push_u16(bytes: &mut Vec<u8>, value: u16, big_endian: bool) {
    let raw = if big_endian {
        value.to_be_bytes()
    } else {
        value.to_le_bytes()
    };
    bytes.extend_from_slice(&raw);
}

fn push_u32(bytes: &mut Vec<u8>, value: u32, big_endian: bool) {
    let raw = if big_endian {
        value.to_be_bytes()
    } else {
        value.to_le_bytes()
    };
    bytes.extend_from_slice(&raw);
}

/// 把 `Software` 标签写进 EXIF 段（导出产物标注生成工具与版本）。
///
/// **不改动任何既有标签与偏移**：做法是把新的 IFD0 追加到段尾 —— 原条目逐条拷贝，
/// 只把 Software 那条换掉（没有就补一条）—— 然后把 TIFF 头里的「IFD0 偏移」改一次指向它。
/// 数据区、Exif SubIFD、MakerNote、缩略图用的都是相对 TIFF 头的**绝对偏移**，全部不变，
/// 因此不会被破坏；代价只是旧 IFD0 变成几十字节无人引用的垃圾，
/// 远比搬移整个数据区（要重写所有偏移）安全。
///
/// 段结构：`FF E1` + 段长(2) + `Exif\0\0` + TIFF。返回是否写入成功。
fn write_software_tag(segment: &mut Vec<u8>, software: &str) -> bool {
    let Some(tiff) = tiff_start(segment) else {
        return false;
    };

    let big_endian = match segment.get(tiff..tiff + 2) {
        Some([0x49, 0x49]) => false, // "II"
        Some([0x4D, 0x4D]) => true,  // "MM"
        _ => return false,
    };

    let Some(ifd0) = read_u32(segment, tiff + 4, big_endian).map(|value| value as usize) else {
        return false;
    };
    let Some(ifd0_start) = tiff.checked_add(ifd0) else {
        return false;
    };
    let Some(count) = read_u16(segment, ifd0_start, big_endian).map(|value| value as usize) else {
        return false;
    };

    let entries_start = ifd0_start + 2;
    let next_ifd_at = entries_start + count * 12;
    if next_ifd_at + 4 > segment.len() {
        return false;
    }

    // 追加位置按字对齐：TIFF 的值要求偶数偏移
    if !(segment.len() - tiff).is_multiple_of(2) {
        segment.push(0);
    }

    // 老条目里丢掉旧的 Software，下面统一补一条新的
    let mut entries: Vec<u8> = Vec::with_capacity(count * 12);
    for index in 0..count {
        let entry = entries_start + index * 12;
        let tag = read_u16(segment, entry, big_endian).unwrap_or(0);

        if tag != TIFF_TAG_SOFTWARE {
            entries.extend_from_slice(&segment[entry..entry + 12]);
        }
    }

    let next_ifd = segment[next_ifd_at..next_ifd_at + 4].to_vec();
    let entry_count = entries.len() / 12 + 1;
    let new_ifd0 = segment.len();
    let string_at = new_ifd0 + 2 + entry_count * 12 + 4;

    push_u16(segment, entry_count as u16, big_endian);
    segment.extend_from_slice(&entries);
    push_u16(segment, TIFF_TAG_SOFTWARE, big_endian);
    push_u16(segment, TIFF_TYPE_ASCII, big_endian);
    // ASCII 的 count 含结尾的 NUL
    push_u32(segment, (software.len() + 1) as u32, big_endian);
    push_u32(segment, (string_at - tiff) as u32, big_endian);
    segment.extend_from_slice(&next_ifd);
    segment.extend_from_slice(software.as_bytes());
    segment.push(0);
    if !(segment.len() - tiff).is_multiple_of(2) {
        segment.push(0);
    }

    // 头里的 IFD0 指针改指向新副本
    if !write_u32(segment, tiff + 4, (new_ifd0 - tiff) as u32, big_endian) {
        return false;
    }

    // APP1 段长 = 段内总字节 - marker 的 2 字节
    let length = segment.len().saturating_sub(2);
    if length > u16::MAX as usize {
        return false;
    }
    segment[2] = (length >> 8) as u8;
    segment[3] = (length & 0xFF) as u8;

    true
}

struct IfdPatchResult {
    /// 实际改写成功的标签数
    patched: usize,
    /// IFD 里的 Exif SubIFD 偏移（相对 TIFF 头）
    exif_ifd: Option<u32>,
}

/// 在一个 IFD 里就地改写指定标签的值，并顺手取出 Exif SubIFD 指针。
///
/// 只处理 SHORT / LONG、count 为 1 的条目：这类条目的值直接写在条目里，
/// 改值不会改变段长；类型不符或值超范围就跳过，绝不重建 IFD。
fn patch_ifd(
    segment: &mut [u8],
    tiff: usize,
    ifd: usize,
    big_endian: bool,
    values: &[(u16, u32)],
) -> IfdPatchResult {
    let mut result = IfdPatchResult {
        patched: 0,
        exif_ifd: None,
    };

    let base = match tiff.checked_add(ifd) {
        Some(base) => base,
        None => return result,
    };
    let Some(count) = read_u16(segment, base, big_endian) else {
        return result;
    };

    for index in 0..count as usize {
        let entry = base + 2 + index * 12;
        let Some(tag) = read_u16(segment, entry, big_endian) else {
            return result;
        };
        let Some(field_type) = read_u16(segment, entry + 2, big_endian) else {
            return result;
        };
        let Some(field_count) = read_u32(segment, entry + 4, big_endian) else {
            return result;
        };

        if tag == TIFF_TAG_EXIF_IFD && field_type == TIFF_TYPE_LONG && field_count == 1 {
            result.exif_ifd = read_u32(segment, entry + 8, big_endian);
            continue;
        }

        let Some((_, value)) = values.iter().find(|(candidate, _)| *candidate == tag) else {
            continue;
        };
        if field_count != 1 {
            continue;
        }

        match field_type {
            // 写成功才计数：`match` 臂里再套一层 `if` 会被 clippy 判 collapsible_match，
            // 这里直接累加布尔值，语义不变（true = 1）。
            TIFF_TYPE_SHORT if *value <= u32::from(u16::MAX) => {
                result.patched +=
                    usize::from(write_u16(segment, entry + 8, *value as u16, big_endian));
            }
            TIFF_TYPE_LONG => {
                result.patched += usize::from(write_u32(segment, entry + 8, *value, big_endian));
            }
            _ => {}
        }
    }

    result
}

/// 把 IFD0 的 next-IFD 指针清零。
///
/// APP1 段里的下一个 IFD 是原图的缩略图（IFD1）：导出画面已经变了，留着它只会
/// 让看图软件看到一张与原图一致的缩略图，还白占十几 KB。清零即可让解析器忽略它，
/// 段长保持不变。
fn clear_next_ifd(segment: &mut [u8], tiff: usize, ifd: usize, big_endian: bool) -> bool {
    let Some(base) = tiff.checked_add(ifd) else {
        return false;
    };
    let Some(count) = read_u16(segment, base, big_endian) else {
        return false;
    };
    write_u32(segment, base + 2 + count as usize * 12, 0, big_endian)
}

/// 读出 JPEG 的实际像素尺寸（SOF 帧头）。
///
/// 用它而不是让前端传参：导出倍率、尺寸适配器怎么算都不会错。
pub(crate) fn jpeg_frame_size(data: &[u8]) -> Option<(u32, u32)> {
    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return None;
    }

    let mut pos = 2usize;
    while pos + 3 < data.len() {
        if data[pos] != 0xFF {
            return None;
        }

        let marker = data[pos + 1];
        // 填充字节与无长度字段的标记（RSTn / SOI）
        if marker == 0xFF {
            pos += 1;
            continue;
        }
        if marker == 0xD8 || (0xD0..=0xD7).contains(&marker) {
            pos += 2;
            continue;
        }
        if marker == 0xDA || marker == 0xD9 {
            return None;
        }

        let length = ((data[pos + 2] as usize) << 8) | (data[pos + 3] as usize);
        if length < 2 || pos + 2 + length > data.len() {
            return None;
        }

        // SOF0~SOF15，剔除 DHT(0xC4)、JPG(0xC8)、DAC(0xCC)
        let is_frame_header =
            (0xC0..=0xCF).contains(&marker) && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
        if is_frame_header {
            let height = ((data[pos + 5] as u32) << 8) | data[pos + 6] as u32;
            let width = ((data[pos + 7] as u32) << 8) | data[pos + 8] as u32;
            return Some((width, height));
        }

        pos += 2 + length;
    }

    None
}

/// 把原图 EXIF 段对齐到导出结果：改写宽高、朝向归一为 1、丢掉缩略图链。
///
/// 段长不变（都是就地改值），所以直接改注入用的那段字节。返回改写成功的标签数，
/// 段结构不认时返回 0，调用方照常注入原段。
pub(crate) fn align_exif_segment(segment: &mut [u8], width: u32, height: u32) -> usize {
    let Some(tiff) = tiff_start(segment) else {
        return 0;
    };
    let Some(byte_order) = segment.get(tiff..tiff + 2) else {
        return 0;
    };
    let big_endian = match byte_order {
        b"II" => false,
        b"MM" => true,
        _ => return 0,
    };
    let Some(ifd0) = read_u32(segment, tiff + 4, big_endian) else {
        return 0;
    };

    let ifd0_result = patch_ifd(
        segment,
        tiff,
        ifd0 as usize,
        big_endian,
        &[
            (TIFF_TAG_IMAGE_WIDTH, width),
            (TIFF_TAG_IMAGE_LENGTH, height),
            // 导出的像素已经是正立的，再留一个「顺时针 90°」会让看图软件转错
            (TIFF_TAG_ORIENTATION, 1),
        ],
    );

    let mut patched = ifd0_result.patched;
    if let Some(exif_ifd) = ifd0_result.exif_ifd {
        let sub = patch_ifd(
            segment,
            tiff,
            exif_ifd as usize,
            big_endian,
            &[
                (TIFF_TAG_PIXEL_X_DIMENSION, width),
                (TIFF_TAG_PIXEL_Y_DIMENSION, height),
            ],
        );
        patched += sub.patched;
    }

    clear_next_ifd(segment, tiff, ifd0 as usize, big_endian);
    patched
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 手搓一段带 IFD0 + Exif SubIFD 的 EXIF 段；`big_endian` 决定字节序。
    fn build_segment(big_endian: bool, orientation_short: bool) -> Vec<u8> {
        let mut tiff: Vec<u8> = Vec::new();
        let u16b = |value: u16| {
            if big_endian {
                value.to_be_bytes().to_vec()
            } else {
                value.to_le_bytes().to_vec()
            }
        };
        let u32b = |value: u32| {
            if big_endian {
                value.to_be_bytes().to_vec()
            } else {
                value.to_le_bytes().to_vec()
            }
        };
        let entry = |tag: u16, field_type: u16, count: u32, value: u32| {
            let mut out = u16b(tag);
            out.extend(u16b(field_type));
            out.extend(u32b(count));
            out.extend(u32b(value));
            out
        };

        // TIFF 头（8 字节）→ IFD0 在 8，SubIFD 紧随 IFD0 之后
        let ifd0_entries = 4usize;
        let ifd0_size = 2 + ifd0_entries * 12 + 4;
        let sub_ifd = 8 + ifd0_size;

        tiff.extend(if big_endian { b"MM" } else { b"II" });
        tiff.extend(u16b(42));
        tiff.extend(u32b(8));

        tiff.extend(u16b(ifd0_entries as u16));
        tiff.extend(entry(TIFF_TAG_IMAGE_WIDTH, TIFF_TYPE_SHORT, 1, 4000));
        tiff.extend(entry(TIFF_TAG_IMAGE_LENGTH, TIFF_TYPE_SHORT, 1, 3000));
        tiff.extend(entry(
            TIFF_TAG_ORIENTATION,
            if orientation_short {
                TIFF_TYPE_SHORT
            } else {
                TIFF_TYPE_LONG
            },
            1,
            8,
        ));
        tiff.extend(entry(TIFF_TAG_EXIF_IFD, TIFF_TYPE_LONG, 1, sub_ifd as u32));
        // next-IFD 指向缩略图
        tiff.extend(u32b((sub_ifd + 2 + 2 * 12 + 4) as u32));

        tiff.extend(u16b(2));
        tiff.extend(entry(TIFF_TAG_PIXEL_X_DIMENSION, TIFF_TYPE_LONG, 1, 4000));
        tiff.extend(entry(TIFF_TAG_PIXEL_Y_DIMENSION, TIFF_TYPE_LONG, 1, 3000));
        tiff.extend(u32b(0));

        let mut segment = vec![0xFF, 0xE1, 0x00, 0x00];
        segment.extend(b"Exif\0\0");
        segment.extend(tiff);
        let length = (segment.len() - 2) as u16;
        segment[2..4].copy_from_slice(&length.to_be_bytes());
        segment
    }

    /// 按条目自己的类型读值：SHORT 只占值域前 2 字节，按 u32 读会读到相邻条目的字节。
    fn read_tag(segment: &[u8], tiff: usize, ifd: usize, tag: u16, big_endian: bool) -> u32 {
        let base = tiff + ifd;
        let count = read_u16(segment, base, big_endian).unwrap();
        for index in 0..count as usize {
            let entry = base + 2 + index * 12;
            if read_u16(segment, entry, big_endian).unwrap() == tag {
                return match read_u16(segment, entry + 2, big_endian).unwrap() {
                    TIFF_TYPE_SHORT => u32::from(read_u16(segment, entry + 8, big_endian).unwrap()),
                    _ => read_u32(segment, entry + 8, big_endian).unwrap(),
                };
            }
        }
        panic!("标签 {tag:#06x} 不存在");
    }

    #[test]
    fn patch_dimensions_and_orientation() {
        for big_endian in [false, true] {
            let mut segment = build_segment(big_endian, true);
            let tiff = tiff_start(&segment).unwrap();
            let patched = align_exif_segment(&mut segment, 1280, 720);

            assert_eq!(
                read_tag(&segment, tiff, 8, TIFF_TAG_IMAGE_WIDTH, big_endian),
                1280
            );
            assert_eq!(
                read_tag(&segment, tiff, 8, TIFF_TAG_IMAGE_LENGTH, big_endian),
                720
            );
            assert_eq!(
                read_tag(&segment, tiff, 8, TIFF_TAG_ORIENTATION, big_endian),
                1
            );

            let sub = read_tag(&segment, tiff, 8, TIFF_TAG_EXIF_IFD, big_endian) as usize;
            assert_eq!(
                read_tag(&segment, tiff, sub, TIFF_TAG_PIXEL_X_DIMENSION, big_endian),
                1280
            );
            assert_eq!(
                read_tag(&segment, tiff, sub, TIFF_TAG_PIXEL_Y_DIMENSION, big_endian),
                720
            );
            // 5 个标签：IFD0 的 3 个 + SubIFD 的 2 个
            assert_eq!(patched, 5);
        }
    }

    #[test]
    fn drops_thumbnail_chain() {
        let mut segment = build_segment(false, true);
        let tiff = tiff_start(&segment).unwrap();
        align_exif_segment(&mut segment, 100, 100);

        let base = tiff + 8;
        let count = read_u16(&segment, base, false).unwrap() as usize;
        let next = read_u32(&segment, base + 2 + count * 12, false).unwrap();
        assert_eq!(next, 0, "IFD0 的 next-IFD 应该被清零");
    }

    #[test]
    fn keeps_segment_length() {
        let mut segment = build_segment(false, true);
        let before = segment.len();
        align_exif_segment(&mut segment, 1280, 720);
        assert_eq!(segment.len(), before, "就地改值不应改变段长");
    }

    #[test]
    fn skips_non_short_or_long_values() {
        // 朝向标签是 LONG 时同样要能改（有些写入器用 LONG 存枚举）
        let mut segment = build_segment(false, false);
        let tiff = tiff_start(&segment).unwrap();
        align_exif_segment(&mut segment, 1280, 720);
        assert_eq!(read_tag(&segment, tiff, 8, TIFF_TAG_ORIENTATION, false), 1);
    }

    #[test]
    fn tolerates_garbage_segment() {
        let mut garbage = vec![1u8, 2, 3, 4, 5, 6, 7, 8];
        assert_eq!(align_exif_segment(&mut garbage, 100, 100), 0);
    }

    /// 最小可用的 JPEG：SOI + SOF0（高 720 宽 1280）+ EOI 标记。
    fn tiny_jpeg() -> Vec<u8> {
        vec![
            0xFF, 0xD8, // SOI
            0xFF, 0xC0, 0x00, 0x11, 0x08, 0x02, 0xD0, 0x05, 0x00, // SOF0: 720 x 1280
            0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 采样表
            0xFF, 0xD9, // EOI
        ]
    }

    #[test]
    fn insert_command_aligns_to_the_exported_pixels() {
        let segment = build_segment(false, true);
        let output = insert_jpeg_exif(tiny_jpeg(), segment, true).unwrap();

        // 段被插在 SOI 之后，尺寸改成这张 JPEG 的实际像素
        assert_eq!(&output[..2], &[0xFF, 0xD8]);
        assert_eq!(&output[2..4], &[0xFF, 0xE1]);
        let tiff = 2 + tiff_start(&output[2..]).unwrap();
        assert_eq!(
            read_tag(&output[2..], tiff - 2, 8, TIFF_TAG_IMAGE_WIDTH, false),
            1280
        );
        assert_eq!(
            read_tag(&output[2..], tiff - 2, 8, TIFF_TAG_IMAGE_LENGTH, false),
            720
        );
        assert_eq!(
            read_tag(&output[2..], tiff - 2, 8, TIFF_TAG_ORIENTATION, false),
            1
        );
    }

    #[test]
    fn insert_command_keeps_the_segment_when_not_aligning() {
        let segment = build_segment(false, true);
        let original = segment.clone();
        let output = insert_jpeg_exif(tiny_jpeg(), segment, false).unwrap();

        assert_eq!(&output[2..2 + original.len()], original.as_slice());
    }

    #[test]
    fn reads_jpeg_frame_size() {
        // SOI + APP0(占位) + SOF0(高 720 宽 1280)
        let jpeg = [
            0xFF, 0xD8, // SOI
            0xFF, 0xE0, 0x00, 0x04, 0x00, 0x00, // APP0
            0xFF, 0xC0, 0x00, 0x11, 0x08, 0x02, 0xD0, 0x05, 0x00, // SOF0: 720 x 1280
            0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, // 采样表
        ];
        assert_eq!(jpeg_frame_size(&jpeg), Some((1280, 720)));
    }

    #[test]
    fn frame_size_needs_a_frame_header() {
        let jpeg = [0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02];
        assert_eq!(jpeg_frame_size(&jpeg), None);
        assert_eq!(jpeg_frame_size(&[]), None);
    }

    #[test]
    fn writes_the_software_tag_into_ifd0() {
        let software = "Copicseal v1.2.3";

        // 最小的 APP1 段：marker + 段长占位 + "Exif\0\0" + 小端 TIFF（IFD0 里只有 Make）
        let mut segment: Vec<u8> = vec![0xFF, 0xE1, 0x00, 0x00];
        segment.extend_from_slice(b"Exif\0\0");
        segment.extend_from_slice(b"II\x2A\x00");
        segment.extend_from_slice(&8u32.to_le_bytes());

        let make = b"Canon\0";
        let value_offset = 8 + 2 + 12 + 4;
        segment.extend_from_slice(&1u16.to_le_bytes());
        segment.extend_from_slice(&0x010Fu16.to_le_bytes()); // Make
        segment.extend_from_slice(&TIFF_TYPE_ASCII.to_le_bytes());
        segment.extend_from_slice(&(make.len() as u32).to_le_bytes());
        segment.extend_from_slice(&(value_offset as u32).to_le_bytes());
        segment.extend_from_slice(&0u32.to_le_bytes()); // 没有 IFD1
        segment.extend_from_slice(make);

        assert!(write_software_tag(&mut segment, software));

        // 段长与内容自洽
        let length = ((segment[2] as usize) << 8) | segment[3] as usize;
        assert_eq!(length, segment.len() - 2);

        // 新 IFD0 里 Make 还在，并多了一条 Software
        let tiff = tiff_start(&segment).unwrap();
        let ifd0 = read_u32(&segment, tiff + 4, false).unwrap() as usize;
        let base = tiff + ifd0;
        assert_eq!(read_u16(&segment, base, false), Some(2));

        let tags: Vec<u16> = (0..2)
            .map(|index| read_u16(&segment, base + 2 + index * 12, false).unwrap())
            .collect();
        assert!(tags.contains(&0x010F), "Make 应该保留");
        assert!(tags.contains(&TIFF_TAG_SOFTWARE), "应该写入 Software");

        // Software 的 count 与内容都按字符串算，不手数
        let software_entry = base + 2 + 12;
        let offset = read_u32(&segment, software_entry + 8, false).unwrap() as usize;
        let count = read_u32(&segment, software_entry + 4, false).unwrap() as usize;
        let expected = format!("{software}\0");
        assert_eq!(count, expected.len(), "ASCII 的 count 应含结尾 NUL");
        assert_eq!(
            &segment[tiff + offset..][..expected.len()],
            expected.as_bytes()
        );
    }
}
