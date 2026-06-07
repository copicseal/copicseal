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

    for field in exif.fields() {
        match field.tag {
            exif::Tag::Make
            | exif::Tag::Model
            | exif::Tag::LensModel
            | exif::Tag::DateTimeOriginal
            | exif::Tag::WhiteBalance
            | exif::Tag::MeteringMode => {
                let val = field.display_value().to_string();
                if !val.is_empty() {
                    match field.tag {
                        exif::Tag::Make => data.make = Some(normalize_brand(&val)),
                        exif::Tag::Model => data.model = Some(val),
                        exif::Tag::LensModel => data.lens_model = Some(val),
                        exif::Tag::DateTimeOriginal => data.date_taken = Some(val),
                        exif::Tag::WhiteBalance => data.white_balance = Some(val),
                        exif::Tag::MeteringMode => data.metering_mode = Some(val),
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
            _ => {}
        }
    }

    Ok(data)
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

#[tauri::command]
pub fn insert_jpeg_exif(jpeg_data: Vec<u8>, exif_segment: Vec<u8>) -> Result<Vec<u8>, String> {
    if jpeg_data.len() < 2 || jpeg_data[0] != 0xFF || jpeg_data[1] != 0xD8 {
        return Err("不是有效的 JPEG 数据".into());
    }

    let mut result = Vec::with_capacity(jpeg_data.len() + exif_segment.len());
    result.extend_from_slice(&jpeg_data[..2]);
    result.extend_from_slice(&exif_segment);
    result.extend_from_slice(&jpeg_data[2..]);

    Ok(result)
}
