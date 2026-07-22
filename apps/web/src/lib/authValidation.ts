export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, message: 'Vui lòng nhập địa chỉ email.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Địa chỉ email không đúng định dạng (vd: user@example.com).' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: 'Vui lòng nhập mật khẩu.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự.' };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasNumber) {
    return { valid: false, message: 'Mật khẩu phải bao gồm ít nhất một chữ hoa, chữ thường và chữ số.' };
  }
  return { valid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { valid: false, message: 'Vui lòng nhập mật khẩu xác nhận.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Mật khẩu xác nhận không trùng khớp.' };
  }
  return { valid: true };
}
