use crate::prelude::*;
use tauri::{AppHandle, Emitter as _, Manager as _};
use tauri_specta::Event as _;
use tokio::sync::broadcast::{Receiver, Sender};

static CAPTURE_THREAD_REQUEST_SENDER: std::sync::OnceLock<Sender<CaptureThreadRequest>> =
    std::sync::OnceLock::new();

#[derive(Debug, Clone, PartialEq)]
pub enum CaptureThreadRequest {
    Start,
    Quit,
}

pub fn create_capture_thread(app_handle: AppHandle) -> Sender<CaptureThreadRequest> {
    let (tx, rx) = tokio::sync::broadcast::channel::<CaptureThreadRequest>(10);

    std::thread::spawn(move || {
        let result = capture_thread(app_handle, rx);

        match result {
            Ok(_) => info!("Capture thread exited normally"),
            Err(e) => error!("Capture thread exited with error: {}", e),
        };
    });

    tx
}

fn capture_thread(
    app_handle: AppHandle,
    mut request_receiver: Receiver<CaptureThreadRequest>,
) -> Result<String, String> {
    loop {
        loop {
            if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Start {
                break;
            };
        }

        let webview = app_handle.get_webview_window("main");

        if let Some(window) = &webview {
            if let Err(error) = window.hide() {
                info!("Failed to hide main window: {:?}", error);
            }
        }

        std::thread::sleep(std::time::Duration::from_millis(500));

        // capture every screens
        let monitors = windows_capture::monitor::Monitor::enumerate().unwrap();
        for (i, monitor) in monitors.iter().enumerate() {
            // NOTE: 2nd argument must be matched with label of WebviewWindow
            let path = get_capture_url(&app_handle, format!("capture_{}", i))
                .map_err(|e| format!("Failed to get temp file path: {e}"))?;

            match capture_monitor(&path, *monitor) {
                Ok(_) => info!("Captured monitor {} to {:?}", i, path),
                Err(e) => info!("Failed to capture monitor {}: {}", i, e),
            }
        }

        info!("Finished capturing all monitors.");

        let tauri_monitors = app_handle
            .available_monitors()
            .expect("Failed to get monitor");

        for (i, monitor) in monitors.iter().enumerate() {
            let tauri_monitor = tauri_monitors.get(i).ok_or("Not enough monitors")?.clone();

            info!(
                "Monitor {}(Tauri monitor: {}): {:?}, size: {:?}, position: {:?}",
                i,
                monitor
                    .name()
                    .map_err(|e| format!("Monitor {} has no name: {:?}", i, e))?,
                tauri_monitor.name(),
                tauri_monitor.size(),
                tauri_monitor.position()
            );

            let app_handle = app_handle.clone();

            info!("Spawning window for monitor {}", i);

            // NOTE: We add 10 pixel offset to avoid invalid monitor
            /*let x = tauri_monitor.work_area().position.x as f64 + 10.0;
            let y = tauri_monitor.work_area().position.y as f64 + 10.0;*/

            let request_receiver = request_receiver.resubscribe();

            // FIXME: Does not need to spawn a new thread for each window?
            std::thread::spawn(move || {
                let window = tauri::webview::WebviewWindowBuilder::new(
                    &app_handle,
                    format!("capture_{}", i),
                    tauri::WebviewUrl::App("/capture/".into()),
                )
                .decorations(false)
                .shadow(false)
                .inner_size(
                    tauri_monitor.size().width as f64,
                    tauri_monitor.size().height as f64,
                )
                .position(
                    tauri_monitor.position().x as f64,
                    tauri_monitor.position().y as f64,
                )
                .transparent(true)
                .background_color(tauri::window::Color(0, 0, 0, 0))
                .resizable(false)
                .build()
                .unwrap();

                // NOTE: Somehow we need to set position after the window creation to make it work correctly
                window
                    .set_position(*tauri_monitor.position())
                    .unwrap_or_else(|e| info!("Failed to set position for monitor: {:?}", e));

                window
                    .set_size(*tauri_monitor.size())
                    .unwrap_or_else(|e| info!("Failed to set size for monitor: {:?}", e));

                let mut request_receiver = request_receiver;

                loop {
                    if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Quit {
                        break;
                    };
                }

                window.close().unwrap();
            });
        }

        if let Some(window) = &webview {
            if let Err(error) = window.show() {
                info!("Failed to show main window: {:?}", error);
            }
        }

        loop {
            if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Quit {
                std::thread::sleep(std::time::Duration::from_secs(1)); // wait for windows to close
                break;
            }
        }
    }
}

pub fn init_capture_thread(app_handle: AppHandle) {
    CAPTURE_THREAD_REQUEST_SENDER.get_or_init(|| create_capture_thread(app_handle));
}

#[tauri::command]
#[specta::specta]
pub fn start_capture() -> Result<(), String> {
    let Some(sender) = CAPTURE_THREAD_REQUEST_SENDER.get() else {
        return Err("Capture thread is not initialized".to_string());
    };

    sender
        .send(CaptureThreadRequest::Start)
        .map_err(|e| format!("Failed to send start request: {}", e))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn stop_capture() -> Result<(), String> {
    let Some(sender) = CAPTURE_THREAD_REQUEST_SENDER.get() else {
        return Err("Capture thread is not initialized".to_string());
    };

    sender
        .send(CaptureThreadRequest::Quit)
        .map_err(|e| format!("Failed to send quit request: {}", e))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_capture_url_command(
    app_handle: AppHandle,
    monitor_id: String,
) -> Result<String, String> {
    match get_capture_url(&app_handle, monitor_id) {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get capture URL: {e}")),
    }
}

#[derive(Debug, Clone, specta::Type, serde::Serialize, serde::Deserialize)]
pub struct NormalizedRect {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
}

impl NormalizedRect {
    fn to_rect(&self, img_width: u32, img_height: u32) -> Rect {
        Rect {
            x1: (self.x1 * img_width as f32) as u32,
            y1: (self.y1 * img_height as f32) as u32,
            x2: (self.x2 * img_width as f32) as u32,
            y2: (self.y2 * img_height as f32) as u32,
        }
    }
}

struct Rect {
    x1: u32,
    y1: u32,
    x2: u32,
    y2: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, specta::Type)]
pub enum FinishCaptureNextAction {
    Ask,
    UploadImageToVideoServer,
    UploadImageToImageServer,
    UploadImageToVRChatPrint,
}

#[tauri::command]
#[specta::specta]
pub fn finish_capture_with_cropped_rect(
    app_handle: AppHandle,
    monitor_id: &str,
    rect: NormalizedRect,
    next_action: FinishCaptureNextAction,
) -> Result<(), String> {
    info!("Finishing capture with cropped rect: {:?}", rect);

    let capture_path = get_capture_url(&app_handle, monitor_id.to_string())
        .map_err(|e| format!("Failed to get capture URL: {e}"))?;

    let result_path = crate::file::temp_file_path("cropped.png");

    let img =
        image::open(&capture_path).map_err(|e| format!("Failed to open captured image: {e}"))?;

    let rect = rect.to_rect(img.width(), img.height());

    let x1 = std::cmp::min(rect.x1, rect.x2);
    let y1 = std::cmp::min(rect.y1, rect.y2);
    let width = std::cmp::max(rect.x1, rect.x2) - x1;
    let height = std::cmp::max(rect.y1, rect.y2) - y1;

    info!(
        "Cropping image: x1={}, y1={}, width={}, height={}",
        x1, y1, width, height
    );

    let cropped = img.crop_imm(
        x1,
        y1,
        std::cmp::min(width, img.width() - x1),
        std::cmp::min(height, img.height() - y1),
    );

    cropped
        .save(&result_path)
        .map_err(|e| format!("Failed to save cropped image: {e}"))?;

    stop_capture()?;

    let send_request_event = crate::SendRequestEvent {
        file: result_path.to_string_lossy().to_string(),
        mode: match next_action {
            FinishCaptureNextAction::Ask => None,
            FinishCaptureNextAction::UploadImageToVideoServer => {
                Some(crate::SendRequestEventMode::UploadImageToVideoServer)
            }
            FinishCaptureNextAction::UploadImageToImageServer => {
                Some(crate::SendRequestEventMode::UploadImageToImageServer)
            }
            FinishCaptureNextAction::UploadImageToVRChatPrint => {
                Some(crate::SendRequestEventMode::UploadImageToVRChatPrint)
            }
        },
    };

    send_request_event
        .emit(&app_handle)
        .map_err(|e| format!("Failed to emit send_request event: {e}"))?;

    Ok(())
}

fn get_capture_url(
    app_handle: &AppHandle,
    monitor_id: String,
) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let path_string = format!("screenshot_monitor_{}.png", monitor_id);
    let path = app_handle
        .path()
        .temp_dir()
        .map_err(|d| format!("Failed to get temp directory: {d}"))?
        .join(std::path::Path::new(&path_string));

    Ok(path)
}

fn capture_monitor(
    path: &std::path::Path,
    monitor: windows_capture::monitor::Monitor,
) -> Result<(), Box<dyn std::error::Error>> {
    // Select a monitor (primary in this example)

    // Create a duplication session for this monitor
    let mut dup = windows_capture::dxgi_duplication_api::DxgiDuplicationApi::new(monitor)?;

    for i in 0..10 {
        // Try to grab one frame within ~33ms (about 30 FPS budget)
        let mut frame = dup.acquire_next_frame(1000)?;

        // Map the GPU image into CPU memory and save a PNG
        // Note: The API could send an empty frame especially
        // in the first few calls, you can check this by seeing if
        // frame.frame_info().LastPresentTime is zero.

        if frame.frame_info().LastPresentTime == 0 {
            info!("Frame {} is empty", i);
            continue;
        }

        frame.save_as_image(path, windows_capture::encoder::ImageFormat::Png)?;

        return Ok(());
    }

    Err("No frame captured".into())
}
