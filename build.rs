// Generate THIRDPARTY
fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=about.hbs");

    std::process::Command::new("cargo")
        .args(["about", "generate", "about.hbs", "-o", "THIRDPARTY"])
        .status()
        .expect("Failed to execute cargo-about. Is it installed?");
}
