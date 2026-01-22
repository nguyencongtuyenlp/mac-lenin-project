# 🎄 Hướng Dẫn Chạy Dự Án Giáng Sinh An Lành

## 📋 Yêu Cầu
- Python 3.x (đã cài đặt trên máy)
- Trình duyệt web hiện đại (Chrome, Edge, Firefox...)
- Webcam để sử dụng tính năng nhận diện cử chỉ tay

## 🚀 Cách Chạy

### Phương pháp 1: Sử dụng Python Server (Khuyến nghị)

1. **Chạy file `start_server.bat`** (Windows)
   - Double-click vào file `start_server.bat`
   - Hoặc mở Command Prompt và chạy: `python start_server.py`

2. **Trình duyệt sẽ tự động mở** tại địa chỉ: `http://localhost:8000/index ver1.1.html`

3. **Cho phép truy cập camera** khi trình duyệt yêu cầu

4. **Nhấn nút "START MAGIC"** để bắt đầu

### Phương pháp 2: Mở trực tiếp file HTML

1. Mở file `Mê Ry Chí Mới/index ver1.1.html` hoặc `index ver1.0.html` bằng trình duyệt
2. ⚠️ **Lưu ý**: Một số tính năng có thể không hoạt động do chính sách CORS của trình duyệt

## 🎮 Hướng Dẫn Sử Dụng

### Phiên bản 1.1 (Magic Christmas - Final Clean):
- 🖐 **Xòe tay**: Bung quà và đèn (Explode)
- 🫶 **Hai tay tạo hình trái tim**: Hiển thị "I LOVE YOU"
- ✊ **Nắm tay**: Thu về cây thông (Tree)
- 👌 **Pinch (ngón cái và ngón trỏ chạm nhau)**: Xem ảnh (Photo)

### Phiên bản 1.0 (Giang Sinh An Lanh):
- 🖐 **Xòe tay**: Bung quà và đèn
- 👌 **Pinch**: Xem ảnh
- ✊ **Nắm tay**: Thu cây thông

## 📁 Cấu Trúc Dự Án

```
giang_sinh_an_lanh/
├── Mê Ry Chí Mới/
│   ├── index ver1.0.html    # Phiên bản tiếng Việt
│   ├── index ver1.1.html    # Phiên bản tiếng Anh (mới nhất)
│   ├── audio.mp3            # Nhạc nền
│   ├── image1-5.jpeg        # 5 ảnh để hiển thị
├── start_server.py          # Script Python để chạy server
├── start_server.bat         # File batch để chạy trên Windows
└── HUONG_DAN.md            # File hướng dẫn này
```

## 🔧 Xử Lý Lỗi

### Lỗi: "Camera không hoạt động"
- Kiểm tra xem webcam đã được kết nối và hoạt động
- Cho phép trình duyệt truy cập camera trong cài đặt
- Thử đóng và mở lại trình duyệt

### Lỗi: "File không tìm thấy"
- Đảm bảo bạn đang chạy server từ thư mục gốc của dự án
- Kiểm tra các file ảnh và audio có trong thư mục `Mê Ry Chí Mới/`

### Lỗi: "Python không được tìm thấy"
- Cài đặt Python từ https://www.python.org/
- Đảm bảo đã thêm Python vào PATH khi cài đặt

## 💡 Mẹo

- Đảm bảo ánh sáng đủ để camera nhận diện cử chỉ tay tốt hơn
- Giữ khoảng cách vừa phải với camera (khoảng 50-100cm)
- Cử chỉ tay rõ ràng sẽ được nhận diện tốt hơn

## 🎉 Chúc bạn Giáng Sinh An Lành!






