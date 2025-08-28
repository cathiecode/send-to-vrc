// Based on https://github.com/woelper/oculante/blob/c66806e8fc5ee0d7fec5f902aab11f6dd757eacc/src/ui/theme.rs

/*
    Original Copyright Notice from oculante:

    MIT License

    Copyright (c) 2020 Johann Woelper

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

use egui::{FontData, FontDefinitions};
use epaint::FontFamily;
use font_kit::{
    family_name::FamilyName, handle::Handle, properties::Properties, source::SystemSource,
};
use log::{debug, info, warn};
use std::{collections::HashMap, fs::read, sync::Arc};

/// Attempt to load a system font by any of the given `family_names`, returning the first match.
fn load_font_family(family_names: &[&str]) -> Option<Vec<u8>> {
    let system_source = SystemSource::new();
    for &name in family_names {
        let font_handle = system_source
            .select_best_match(&[FamilyName::Title(name.to_string())], &Properties::new());
        match font_handle {
            Ok(h) => match &h {
                Handle::Memory { bytes, .. } => {
                    info!("Loaded {name} from memory.");
                    return Some(bytes.to_vec());
                }
                Handle::Path { path, .. } => {
                    info!("Loaded {name} from path: {:?}", path);
                    if let Ok(data) = read(path) {
                        return Some(data);
                    }
                }
            },
            Err(e) => debug!("Could not load {}: {:?}", name, e),
        }
    }
    None
}

pub fn load_system_fonts(mut fonts: FontDefinitions) -> FontDefinitions {
    debug!("Attempting to load sys fonts");
    let mut fontdb = HashMap::new();

    fontdb.insert(
        "simplified_chinese",
        vec![
            "Heiti SC",
            "Songti SC",
            "Noto Sans CJK SC", // Good coverage for Simplified Chinese
            "Noto Sans SC",
            "WenQuanYi Zen Hei", // INcludes both Simplified and Traditional Chinese.
            "SimSun",
            "Noto Sans SC",
            "PingFang SC",
            "Source Han Sans CN",
        ],
    );

    fontdb.insert("traditional_chinese", vec!["Source Han Sans HK"]);

    fontdb.insert(
        "japanese",
        vec![
            "Noto Sans JP",
            "Noto Sans CJK JP",
            "Source Han Sans JP",
            "MS Gothic",
        ],
    );

    fontdb.insert("korean", vec!["Source Han Sans KR"]);

    fontdb.insert("taiwanese", vec!["Source Han Sans TW"]);

    fontdb.insert(
        "arabic_fonts",
        vec![
            "Noto Sans Arabic",
            "Amiri",
            "Lateef",
            "Al Tarikh",
            "Segoe UI",
        ],
    );

    for (region, font_names) in fontdb {
        if let Some(font_data) = load_font_family(&font_names) {
            info!("Inserting font {region}");
            fonts
                .font_data
                .insert(region.to_owned(), Arc::new(FontData::from_owned(font_data)));

            fonts
                .families
                .get_mut(&FontFamily::Proportional)
                .unwrap()
                .push(region.to_owned());
        } else {
            warn!("Could not load a font for region {region}. If you experience incorrect file names, try installing one of these fonts: [{}]", font_names.join(", "))
        }
    }
    fonts
}