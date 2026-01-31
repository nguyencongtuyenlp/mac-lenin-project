# 📖 HƯỚNG DẪN TINH CHỈNH TIMELINE

> **File chính**: `script.js`  
> **Hàm chính**: `createCardTimeline()` (dòng ~620)

---

## 1. KHOẢNG CÁCH NODE/LABEL VỚI ĐƯỜNG LINE CHÍNH

### 📍 Dòng ~717-722 trong `createCardTimeline()`

```javascript
// Khoảng cách node từ line chính
const offset = nodeCount > 6 ? 35 : (nodeCount > 4 ? 40 : 45);

// Vị trí Y của node (trên hoặc dưới line)
const nodeY = (nodeData.position === "above") 
    ? baseY + offset   // Trên đường
    : baseY - offset;  // Dưới đường
```

### ⚙️ Tùy chỉnh:

| Giá trị offset | Kết quả |
|----------------|---------|
| `30` | Gần line hơn |
| `45` | Mặc định |
| `60` | Xa line hơn |

**Ví dụ - Node gần line hơn:**
```javascript
const offset = 25; // Thay vì 35-45
```

---

## 2. KÍCH CỠ LABEL, FONT CHỮ, KHUNG

### 📍 Dòng ~778-818 trong `createCardTimeline()`

### A. Kích thước Canvas (Khung label)

```javascript
// Dòng ~778
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 512;   // Chiều rộng khung
labelCanvas.height = 100;  // Chiều cao khung
```

**Tùy chỉnh:**
- `512` → `600`: Khung rộng hơn
- `100` → `120`: Khung cao hơn

### B. Font chữ

```javascript
// Dòng ~791-793: Kích cỡ font
const yearFontSize = nodeCount > 6 ? 18 : (nodeCount > 4 ? 20 : 22);
const titleFontSize = nodeCount > 6 ? 14 : (nodeCount > 4 ? 16 : 18);
```

**Bảng font:**

| nodeCount | yearFontSize | titleFontSize |
|-----------|--------------|---------------|
| ≤4 | 22px | 18px |
| 5-6 | 20px | 16px |
| 7+ | 18px | 14px |

**Ví dụ font lớn hơn:**
```javascript
const yearFontSize = 26;
const titleFontSize = 20;
```

### C. Tỉ lệ hiển thị Label (Scale)

```javascript
// Dòng ~806-816
let labelScale;
if (nodeCount <= 3) {
    labelScale = { x: 70, y: 15 };   // Lớn nhất
} else if (nodeCount <= 5) {
    labelScale = { x: 60, y: 13 };
} else if (nodeCount <= 7) {
    labelScale = { x: 50, y: 11 };
} else {
    labelScale = { x: 45, y: 10 };   // Nhỏ nhất
}
```

**Ví dụ label to hơn:**
```javascript
labelScale = { x: 80, y: 18 };
```

---

## 3. KÍCH CỠ NODE (Hình tròn)

### 📍 Dòng ~726-730 trong `createCardTimeline()`

```javascript
// Dòng ~726: Bán kính node tự động theo số lượng
const nodeRadius = nodeCount > 6 ? 6 : (nodeCount > 4 ? 7 : 8);

// Dòng ~727: Tạo sphere
const geometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
```

**Bảng bán kính:**

| nodeCount | nodeRadius |
|-----------|------------|
| ≤4 | 8px |
| 5-6 | 7px |
| 7+ | 6px |

**Ví dụ node to hơn:**
```javascript
const nodeRadius = 10; // Cố định 10px cho tất cả
```

### Glow Ring (Vòng sáng):

```javascript
// Dòng ~739-745
new THREE.RingGeometry(
    nodeRadius + 2,    // Bán kính trong
    nodeRadius + 5,    // Bán kính ngoài
    32                 // Độ mịn
)
```

**Glow lớn hơn:**
```javascript
new THREE.RingGeometry(nodeRadius + 4, nodeRadius + 10, 32)
```

---

## 4. PARTICLES (Hạt bay xung quanh node)

### 📍 Dòng ~827-867 - Hàm `createNodeParticles()`

### A. Số lượng hạt

```javascript
// Dòng ~830
const count = 15; // Số hạt mỗi node
```

**Tùy chỉnh:**
- `10`: Ít hạt, nhẹ hơn
- `25`: Nhiều hạt, lung linh hơn

### B. Kích cỡ hạt

```javascript
// Dòng ~852
const mat = new THREE.PointsMaterial({
    size: 1.5,       // Kích cỡ mỗi hạt
    opacity: 0.6,    // Độ trong suốt
});
```

**Hạt lớn hơn:**
```javascript
size: 3.0,
opacity: 0.8,
```

### C. Bán kính bay

```javascript
// Dòng ~835-836: Bán kính bay xung quanh node
const radius = 15 + Math.random() * 20;  // 15-35px
```

**Hạt bay rộng hơn:**
```javascript
const radius = 20 + Math.random() * 40;  // 20-60px
```

---

## 5. BẢNG TỔNG HỢP

| Thành phần | Dòng | Tham số | Mặc định |
|------------|------|---------|----------|
| Khoảng cách node-line | ~718 | `offset` | 35-45 |
| Canvas label | ~778 | `width/height` | 512x100 |
| Font năm | ~791 | `yearFontSize` | 18-22 |
| Font title | ~793 | `titleFontSize` | 14-18 |
| Label scale | ~808 | `labelScale` | 45-70 |
| Node radius | ~726 | `nodeRadius` | 6-8 |
| Glow ring | ~740 | `+2, +5` | - |
| Số particles | ~830 | `count` | 15 |
| Particle size | ~852 | `size` | 1.5 |

---

## 6. TINH CHỈNH TỪNG NODE RIÊNG LẺ

### 📍 Chỉnh trong file `data.js`

Mỗi node có thể có **thuộc tính riêng**, KHÔNG phụ thuộc node khác:

```javascript
{
    id: "1-1",
    year: "1840",
    title: "Sự kiện A",
    position: "above",           // "above" hoặc "below"
    
    // === TÙY CHỈNH RIÊNG NODE NÀY ===
    offsetY: 12,                 // Khoảng cách từ line (pixel)
    nodeRadius: 10,              // Kích cỡ node (null = mặc định)
    labelScale: {x: 80, y: 18},  // Kích cỡ label (null = mặc định)
    nodeColor: 0xFF0000,         // Màu node (null = dùng màu card)
    
    image: null
}
```

### ⚙️ Bảng tham số:

| Tham số | Giá trị mẫu | Ý nghĩa |
|---------|-------------|---------|
| `offsetY` | `12` | Khoảng cách từ line (px) |
| `nodeRadius` | `10` hoặc `null` | Bán kính node |
| `labelScale` | `{x:60, y:13}` hoặc `null` | Kích cỡ label |
| `nodeColor` | `0xFF0000` hoặc `null` | Màu hex cho node |

### 🎯 Ví dụ - Node 1 to, Node 2 nhỏ:

```javascript
timelineNodes: [
    {
        id: "1-1",
        year: "1840",
        title: "Sự kiện QUAN TRỌNG",
        position: "above",
        offsetY: 20,
        nodeRadius: 12,              // ← Node TO
        labelScale: {x: 90, y: 20},  // ← Label TO
        nodeColor: 0xFF5500,         // ← Màu cam
        image: null
    },
    {
        id: "1-2",
        year: "1850",
        title: "Sự kiện phụ",
        position: "below",
        offsetY: 10,
        nodeRadius: 5,               // ← Node NHỎ
        labelScale: {x: 40, y: 10},  // ← Label NHỎ
        nodeColor: null,             // ← Dùng màu card
        image: null
    }
]
```

**Ctrl+F5** để xem thay đổi! 🎉

### 📍 Chỉnh trong file `data.js`

Mỗi node trong `timelineNodes` có 2 tham số điều khiển vị trí:

```javascript
{
    id: "1-1",
    year: "Trước 1840s",
    title: "Bối cảnh bấy giờ",
    position: "above",    // ← "above" = TRÊN đường line, "below" = DƯỚI đường line
    offsetY: 45,          // ← Khoảng cách từ đường line (pixel)
}
```

### ⚙️ Ý nghĩa:

| Tham số | Giá trị | Kết quả |
|---------|---------|---------|
| `position` | `"above"` | Node nằm **phía trên** đường wave |
| `position` | `"below"` | Node nằm **phía dưới** đường wave |
| `offsetY` | `5` | Rất **gần** đường line |
| `offsetY` | `45` | Khoảng cách **trung bình** |
| `offsetY` | `80` | Rất **xa** đường line |

### 🎯 Ví dụ thực tế:

**Node 1 gần line, Node 2 xa line:**
```javascript
timelineNodes: [
    {
        id: "1-1",
        year: "1840",
        title: "Sự kiện A",
        position: "above",
        offsetY: 10,        // ← Gần line (10px)
    },
    {
        id: "1-2", 
        year: "1850",
        title: "Sự kiện B",
        position: "below",
        offsetY: 70,        // ← Xa line (70px)
    }
]
```

### 📊 Sơ đồ minh họa:

```
        [Node above, offsetY=60]
                ↑
                | 60px
                ↓
    ~~~~~~~ WAVE LINE ~~~~~~~
                ↑
                | 30px
                ↓
        [Node below, offsetY=30]
```

**Ctrl+F5** sau khi sửa `data.js` để xem thay đổi!