use windows::Win32::Security::Cryptography::{CryptProtectData, CRYPT_INTEGER_BLOB};

use crate::error::AppError;

pub fn crypt(slice: &[u8]) -> Result<Vec<u8>, AppError> {
    unsafe {
        let pdatain = CRYPT_INTEGER_BLOB {
            cbData: slice.len() as u32,
            pbData: slice.as_ptr() as *mut u8,
        };

        let output_slice = vec![0u8; slice.len() + 16];

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: output_slice.len() as u32,
            pbData: output_slice.as_ptr() as *mut u8,
        };

        let result = CryptProtectData(&pdatain, None, None, None, None, 0x0, &mut output);

        if result.is_ok() {
            let mut output_vec = Vec::new();
            output_vec.resize_with(output.cbData as usize, || 0xcf);
            output_vec.copy_from_slice(std::slice::from_raw_parts(
                output.pbData,
                output.cbData as usize,
            ));

            Ok(output_vec)
        } else if let Err(e) = result {
            Err(AppError::Unknown(format!(
                "CryptProtectData failed: {:?}",
                e
            )))
        } else {
            Err(AppError::Unknown(
                "CryptProtectData failed with unknown error".to_string(),
            ))
        }
    }
}

pub fn decrypt(slice: &[u8]) -> Result<Vec<u8>, AppError> {
    use windows::Win32::Security::Cryptography::{CryptUnprotectData, CRYPT_INTEGER_BLOB};

    unsafe {
        let pdatain = CRYPT_INTEGER_BLOB {
            cbData: slice.len() as u32,
            pbData: slice.as_ptr() as *mut u8,
        };

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        let result = CryptUnprotectData(&pdatain, None, None, None, None, 0x0, &mut output);

        if result.is_ok() {
            let mut output_vec = Vec::new();
            output_vec.resize_with(output.cbData as usize, || 0xcf);
            output_vec.copy_from_slice(std::slice::from_raw_parts(
                output.pbData,
                output.cbData as usize,
            ));

            Ok(output_vec)
        } else if let Err(e) = result {
            Err(AppError::Unknown(format!(
                "CryptUnprotectData failed: {:?}",
                e
            )))
        } else {
            Err(AppError::Unknown(
                "CryptUnprotectData failed with unknown error".to_string(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypt_decrypt() {
        let original_data = b"Hello, secure storage!";
        let encrypted_data = crypt(original_data).expect("Encryption failed");
        let decrypted_data = decrypt(&encrypted_data).expect("Decryption failed");

        assert_eq!(original_data.to_vec(), decrypted_data);
    }
}
