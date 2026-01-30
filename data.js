// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
    particleCount: 1000,
    nodeParticleCount: 25,  // Giảm từ 50 → 25 (giảm thêm 50% tính toán)
    timelineLength: 300,
    branchSpacing: 40,
    nodeRadius: 8,
    zoomMin: 0.3,
    zoomMax: 3.0
};

// Prevent init3D from running multiple times
let isInit3DCompleted = false;

// ==========================================
// DOM ELEMENT CACHE (Performance optimization)
// ==========================================
const DOM = {
    canvasContainer: null,
    status: null,
    nodeCardsContainer: null,
    gesturePanel: null,
    header: null,
    globalBackBtn: null,
    welcomeOverlay: null,
    cameraPreview: null,
    title: null
};

function cacheDOMElements() {
    DOM.canvasContainer = document.getElementById('canvas-container');
    DOM.status = document.getElementById('status');
    DOM.nodeCardsContainer = document.getElementById('node-cards-container');
    DOM.gesturePanel = document.getElementById('gesture-panel');
    DOM.header = document.getElementById('header');
    DOM.globalBackBtn = document.getElementById('global-back-btn');
    DOM.welcomeOverlay = document.getElementById('welcome-overlay');
    DOM.cameraPreview = document.getElementById('camera-preview');
    DOM.title = document.getElementById('title');
}

// sửa node ở đây
const timelineData = {
    nodes: [
        {
            id: 1,
            label: "Khởi đầu",
            year: "1848",
            desc: "Điểm xuất phát của hành trình",
            x: -100, y: 60,
            children: [2, 3],
            color: 0xFF6B6B,
            content: {
                description: "Đây là giai đoạn khởi đầu của hành trình. Mọi thứ bắt đầu từ một ý tưởng nhỏ, một ước mơ lớn. Giai đoạn này đặt nền móng cho tất cả những gì sẽ đến sau.",
                video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                events: [
                    { date: "01/2024", title: "Bắt đầu dự án", desc: "Lên ý tưởng và phác thảo kế hoạch ban đầu" },
                    { date: "02/2024", title: "Nghiên cứu thị trường", desc: "Tìm hiểu nhu cầu và đối thủ cạnh tranh" }
                ],
                subNodes: [
                    { id: "1a", label: "Brainstorm", desc: "Thu thập và phát triển ý tưởng sáng tạo" },
                    { id: "1b", label: "Lập kế hoạch", desc: "Xây dựng roadmap chi tiết cho dự án" }
                ]
            }
        },
        {
            id: 2,
            label: "Phát triển",
            year: "1867",
            desc: "Giai đoạn phát triển và học hỏi",
            x: -30, y: -50,
            parent: 1,
            children: [4],
            color: 0x4ECDC4,
            content: {
                description: "Giai đoạn phát triển là thời điểm biến ý tưởng thành hiện thực. Đây là lúc học hỏi các kỹ năng mới, xây dựng sản phẩm và liên tục cải tiến.",
                video: "https://www.youtube.com/embed/jNQXAC9IVRw",
                events: [
                    { date: "03/2024", title: "Prototype v1", desc: "Hoàn thành phiên bản thử nghiệm đầu tiên" },
                    { date: "04/2024", title: "User Testing", desc: "Thu thập feedback từ người dùng thử nghiệm" },
                    { date: "05/2024", title: "Iteration", desc: "Cải tiến dựa trên phản hồi" }
                ],
                subNodes: [
                    { id: "2a", label: "Coding", desc: "Viết code và xây dựng tính năng" },
                    { id: "2b", label: "Design", desc: "Thiết kế giao diện người dùng" },
                    { id: "2c", label: "Testing", desc: "Kiểm thử và đảm bảo chất lượng" }
                ]
            }
        },
        {
            id: 3,
            label: "Thử thách",
            year: "1917",
            desc: "Những khó khăn cần vượt qua",
            x: -30, y: 50,
            parent: 1,
            children: [5],
            color: 0xFFE66D,
            content: {
                description: "Không có hành trình nào mà không có thử thách. Đây là giai đoạn đối mặt với những khó khăn, học cách thích nghi và tìm ra giải pháp sáng tạo.",
                events: [
                    { date: "06/2024", title: "Bug lớn", desc: "Phát hiện và sửa lỗi nghiêm trọng trong hệ thống" },
                    { date: "07/2024", title: "Thay đổi yêu cầu", desc: "Khách hàng thay đổi yêu cầu giữa chừng" }
                ],
                subNodes: [
                    { id: "3a", label: "Problem Solving", desc: "Phân tích và giải quyết vấn đề" },
                    { id: "3b", label: "Adaptation", desc: "Thích nghi với thay đổi" }
                ]
            }
        },
        {
            id: 4,
            label: "Kiến thức",
            desc: "Tích lũy kiến thức và kỹ năng",
            x: 40, y: -80,
            parent: 2,
            children: [],
            color: 0x95E1D3,
            content: {
                description: "Kiến thức là tài sản quý giá nhất. Giai đoạn này tập trung vào việc học hỏi liên tục, nâng cao chuyên môn và mở rộng hiểu biết.",
                video: "https://www.youtube.com/embed/9bZkp7q19f0",
                events: [
                    { date: "08/2024", title: "Khóa học mới", desc: "Hoàn thành khóa học nâng cao" },
                    { date: "09/2024", title: "Chứng chỉ", desc: "Đạt được chứng chỉ chuyên môn" }
                ],
                subNodes: [
                    { id: "4a", label: "Self-learning", desc: "Tự học qua sách và online" },
                    { id: "4b", label: "Mentorship", desc: "Học hỏi từ người có kinh nghiệm" }
                ]
            }
        },
        {
            id: 5,
            label: "Kinh nghiệm",
            desc: "Rút ra bài học từ thử thách",
            x: 40, y: 80,
            parent: 3,
            children: [],
            color: 0xF38181,
            content: {
                description: "Kinh nghiệm đến từ việc thực hành và học hỏi từ những sai lầm. Mỗi thử thách vượt qua đều để lại những bài học quý giá.",
                events: [
                    { date: "10/2024", title: "Bài học quan trọng", desc: "Nhận ra tầm quan trọng của việc lập kế hoạch" },
                    { date: "11/2024", title: "Chia sẻ kinh nghiệm", desc: "Viết blog chia sẻ với cộng đồng" }
                ],
                subNodes: [
                    { id: "5a", label: "Reflection", desc: "Suy ngẫm về những gì đã làm" },
                    { id: "5b", label: "Documentation", desc: "Ghi chép lại bài học" }
                ]
            }
        },
        {
            id: 6,
            label: "Đích đến",
            desc: "Mục tiêu cuối cùng đạt được",
            x: 100, y: -60,
            children: [],
            color: 0xAA96DA,
            content: {
                description: "Đích đến không phải là kết thúc, mà là một khởi đầu mới. Đây là lúc nhìn lại hành trình, ăn mừng thành công và đặt ra những mục tiêu mới cao hơn.",
                video: "https://www.youtube.com/embed/ZbZSe6N_BXs",
                events: [
                    { date: "12/2024", title: "Launch!", desc: "Ra mắt sản phẩm chính thức" },
                    { date: "01/2025", title: "Celebration", desc: "Ăn mừng thành công cùng đội ngũ" }
                ],
                subNodes: [
                    { id: "6a", label: "Celebration", desc: "Ăn mừng và ghi nhận thành tích" },
                    { id: "6b", label: "New Goals", desc: "Đặt ra mục tiêu mới" },
                    { id: "6c", label: "Scale Up", desc: "Mở rộng quy mô" }
                ]
            }
        },
    ],
    // Các kết nối ở đây
    connections: [
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 4 },
        { from: 3, to: 5 },
        { from: 2, to: 6 },
        { from: 3, to: 6 },
    ]
};
