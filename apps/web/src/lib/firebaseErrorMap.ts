export function mapFirebaseErrorToVietnamese(code: string, defaultMsg?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng.';
    case 'auth/user-not-found':
      return 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc đăng ký mới.';
    case 'auth/wrong-password':
      return 'Mật khẩu không chính xác. Vui lòng thử lại.';
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký bởi một tài khoản khác.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số.';
    case 'auth/too-many-requests':
      return 'Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.';
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã được liên kết với một phương thức đăng nhập khác (Google/Facebook). Vui lòng sử dụng phương thức đăng nhập trước đó.';
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập.';
    case 'auth/cancelled-popup-request':
      return 'Yêu cầu đăng nhập bị hủy.';
    case 'auth/operation-not-allowed':
      return 'Tính năng đăng nhập này chưa được bật trong Firebase Console (Authentication -> Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'Tên miền hiện tại chưa được cấp quyền trong Firebase Console.';
    case 'auth/user-disabled':
      return 'Tài khoản của bạn đã bị vô hiệu hóa.';
    case 'auth/requires-recent-login':
      return 'Vui lòng đăng nhập lại để thực hiện thao tác bảo mật này.';
    default:
      return defaultMsg || 'Đã xảy ra lỗi khi xác thực. Vui lòng thử lại.';
  }
}
