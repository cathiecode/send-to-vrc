use std::path::PathBuf;

pub fn temp_file_path(name: &str) -> PathBuf {
    std::env::temp_dir().join(name)
}
