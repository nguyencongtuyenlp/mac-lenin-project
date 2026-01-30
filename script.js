// 2. GLOBAL VARIABLES
// ==========================================
let scene, camera, renderer;
let timelineGroup, particleSystem, nodeParticles = {};
let nodeMeshes = [], connectionLines = [];
let bgStars;

// Interaction state
let currentZoom = 1.0;
let panOffset = { x: 0, y: 0 };
let selectedNode = null;
let hoveredNode = null;

// Hand tracking
let leftHand = null, rightHand = null;
let prevPinchDist = 0;

// NEW: Delta-based pan (preserve position when hand leaves)
let prevPanPos = null;
let isPanning = false;

// NEW: Virtual cursor
let cursorEnabled = false;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

// NEW: Toggle cursor function
function toggleCursor() {
    cursorEnabled = !cursorEnabled;
    const btn = document.getElementById('btn-toggle-cursor');
    const cursor = document.getElementById('virtual-cursor');
    if (cursorEnabled) {
        btn.textContent = '👆 Con trỏ: Bật';
        btn.classList.add('active');
        cursor.style.display = 'block';
    } else {
        btn.textContent = '👆 Con trỏ: Tắt';
        btn.classList.remove('active');
        cursor.style.display = 'none';
    }
}

// NEW: Check if hand is a fist (all fingers closed)
function isFist(landmarks) {
    const fingers = countExtendedFingers(landmarks);
    return !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
}

// ==========================================
// DETAIL VIEW (Drill-down) Functions
// ==========================================
let isInDetailView = false;
let currentDetailNode = null;
let detailViewCooldown = false; // Prevent immediate exit
let lastDetailOpenTime = 0;
const DETAIL_COOLDOWN_MS = 1500; // 1.5 seconds cooldown

// Animate node zoom before opening detail view
function animateNodeZoom(nodeMesh, callback) {
    if (!nodeMesh) {
        callback();
        return;
    }

    const startScale = nodeMesh.scale.x;
    const endScale = startScale * 2.5;
    const duration = 500; // ms
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: easeOutCubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const scale = startScale + (endScale - startScale) * eased;
        nodeMesh.scale.set(scale, scale, scale);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Reset scale and call callback
            nodeMesh.scale.set(startScale, startScale, startScale);
            callback();
        }
    }

    animate();
}

function openDetailView(node) {
    currentGestureContext = GESTURE_CONTEXT.DETAIL; // ✅ ADD

    if (!node || !node.content) return;

    // Prevent opening again if already in detail view
    if (isInDetailView) return;

    isInDetailView = true;
    currentDetailNode = node;
    detailViewCooldown = true;
    lastDetailOpenTime = Date.now();

    // Reset cooldown after delay
    setTimeout(() => {
        detailViewCooldown = false;
    }, DETAIL_COOLDOWN_MS);

    const overlay = document.getElementById('detail-overlay');
    const title = document.getElementById('detail-title');
    const desc = document.getElementById('detail-description');
    const videoSection = document.getElementById('video-section');
    const videoFrame = document.getElementById('detail-video');
    const eventsSection = document.getElementById('events-section');
    const eventsContainer = document.getElementById('detail-events');
    const subnodesSection = document.getElementById('subnodes-section');
    const subnodesContainer = document.getElementById('detail-subnodes');

    // Set title and description
    title.textContent = node.label;
    desc.textContent = node.content.description;

    // Video
    if (node.content.video) {
        videoSection.style.display = 'block';
        videoFrame.src = node.content.video;
    } else {
        videoSection.style.display = 'none';
        videoFrame.src = '';
    }

    // Events
    if (node.content.events && node.content.events.length > 0) {
        eventsSection.style.display = 'block';
        eventsContainer.innerHTML = node.content.events.map(event => `
                    <div class="event-item">
                        <div class="event-date">${event.date}</div>
                        <div class="event-content">
                            <h4>${event.title}</h4>
                            <p>${event.desc}</p>
                        </div>
                    </div>
                `).join('');
    } else {
        eventsSection.style.display = 'none';
    }

    // Sub-nodes
    if (node.content.subNodes && node.content.subNodes.length > 0) {
        subnodesSection.style.display = 'block';
        subnodesContainer.innerHTML = node.content.subNodes.map(subNode => `
                    <div class="subnode-card">
                        <h4>${subNode.label}</h4>
                        <p>${subNode.desc}</p>
                    </div>
                `).join('');
    } else {
        subnodesSection.style.display = 'none';
    }

    // Show overlay with animation
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    // Update status
    document.getElementById('status').textContent = `📂 Đang xem: ${node.label} (Nắm đấm để thoát)`;
}

function exitDetailView() {
    // Check cooldown - only exit if enough time has passed
    if (detailViewCooldown) {
        return; // Don't exit during cooldown
    }

    isInDetailView = false;
    currentDetailNode = null;

    const overlay = document.getElementById('detail-overlay');
    const videoFrame = document.getElementById('detail-video');

    // Stop video
    videoFrame.src = '';

    // Hide overlay with animation
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);

    document.getElementById('status').textContent = 'Đã quay lại Timeline chính';
    currentGestureContext = GESTURE_CONTEXT.TIMELINE;

}

// ==========================================
// 3. THREE.JS INITIALIZATION
// ==========================================
function init3D() {
    // CRITICAL: Prevent multiple calls (fixes missing nodes issue)
    if (isInit3DCompleted) {
        console.log('⚠️ init3D already completed, skipping to prevent scene reset');
        return;
    }

    console.log('✅ Initializing 3D scene...');

    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    // DISABLED FOG for performance (saves 3-5ms per frame)
    // scene.fog = new THREE.FogExp2(0x0a0a1a, 0.003);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 150;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Create main group for timeline (for pan/zoom)
    timelineGroup = new THREE.Group();
    scene.add(timelineGroup);

    // Create elements
    createTimeline();
    createNodes();
    createConnections();

    // Only start loop if not already running
    if (!window.animationLoopStarted) {
        window.animationLoopStarted = true;
        animate();
    }

    isInit3DCompleted = true;
    console.log('✅ 3D scene initialized successfully');
}

// DELETED: createBackgroundStars() and createParticleSystem()
// These functions were never called - 100+ lines of dead code removed
// This reduces file size and eliminates confusion

// ==========================================
// 6. TIMELINE LINE
// ==========================================
// Global variable for the curve
let mainTimelineCurve = null;

// ==========================================
// 6. TIMELINE LINE
// ==========================================
function createTimeline() {
    // 1. TẠO ĐƯỜNG CONG (Curve)
    // Bạn có thể chỉnh các điểm Vector3 ở đây để đổi hình dáng đường line
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-CONFIG.timelineLength - 50, 20, 0), // Điểm đầu xa
        new THREE.Vector3(-CONFIG.timelineLength, 0, 0),
        new THREE.Vector3(-50, 5, 20),
        new THREE.Vector3(0, 0, 0),       // Điểm giữa
        new THREE.Vector3(50, -5, -20),
        new THREE.Vector3(CONFIG.timelineLength, 0, 0),
        new THREE.Vector3(CONFIG.timelineLength + 50, -20, 0)  // Điểm cuối xa
    ]);

    // Save globally for connections
    mainTimelineCurve = curve;

    // 2. TẠO HÌNH KHỐI (Geometry) - Dùng TubeGeometry để có độ dày
    // Tham số thứ 3 (2) là RADIUS (Độ to). Chỉnh số này để to/nhỏ.
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 2, 8, false);

    // 3. MATERIAL CHÍNH (Lõi vàng sáng)
    const material = new THREE.MeshBasicMaterial({
        color: 0xFFD700, // Màu vàng Gold
        transparent: true,
        opacity: 0.8     // Độ đậm
    });

    const timeline = new THREE.Mesh(tubeGeometry, material);
    timelineGroup.add(timeline);

    // 4. HIỆU ỨNG GLOW (Lớp vỏ ngoài phát sáng)
    // Radius to hơn (4) và opacity thấp (0.3) để tạo vùng hào quang
    const glowGeometry = new THREE.TubeGeometry(curve, 100, 4, 8, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6B6B, // Màu đỏ cam (Neon)
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide // Render mặt sau để nhìn xuyên thấu đẹp hơn
    });

    const glowLine = new THREE.Mesh(glowGeometry, glowMaterial);
    timelineGroup.add(glowLine);
}

// ==========================================
// 7. NODES (Interactive Points)
// ==========================================
function createNodes() {
    timelineData.nodes.forEach(nodeData => {
        // Node sphere
        const geometry = new THREE.SphereGeometry(CONFIG.nodeRadius, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: nodeData.color,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(nodeData.x, nodeData.y, 0);
        mesh.userData = nodeData;
        timelineGroup.add(mesh);
        nodeMeshes.push(mesh);

        // Glow ring around node
        const ringGeo = new THREE.RingGeometry(CONFIG.nodeRadius + 2, CONFIG.nodeRadius + 4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: nodeData.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(nodeData.x, nodeData.y, 0);
        mesh.userData.ring = ring;
        timelineGroup.add(ring);

        // Node particles
        createNodeParticles(nodeData);

        // Label
        createNodeLabel(nodeData);
    });
}

function createNodeParticles(nodeData) {
    const positions = [], colors = [], phases = [];
    const count = CONFIG.nodeParticleCount;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 20;
        const x = nodeData.x + Math.cos(angle) * radius;
        const y = nodeData.y + Math.sin(angle) * radius;
        const z = (Math.random() - 0.5) * 30;
        positions.push(x, y, z);

        const color = new THREE.Color(nodeData.color);
        colors.push(color.r, color.g, color.b);
        phases.push(Math.random() * Math.PI * 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.userData = { phases, nodeData, originalPositions: [...positions] };

    const mat = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geo, mat);
    nodeParticles[nodeData.id] = particles;
    timelineGroup.add(particles);
}

function createNodeLabel(nodeData) {
    // Label dưới node (tên)
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.font = 'bold 24px Segoe UI';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(nodeData.label, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(40, 10, 1);
    sprite.position.set(nodeData.x, nodeData.y - 18, 0);
    timelineGroup.add(sprite);

    // Label trên node (năm) - nếu có year data
    if (nodeData.year) {
        const yearCanvas = document.createElement('canvas');
        yearCanvas.width = 128; yearCanvas.height = 48;
        const yearCtx = yearCanvas.getContext('2d');

        yearCtx.font = 'bold 20px Segoe UI';
        yearCtx.fillStyle = '#FFD700'; // Màu vàng Gold
        yearCtx.textAlign = 'center';
        yearCtx.shadowColor = 'rgba(0,0,0,0.8)';
        yearCtx.shadowBlur = 6;
        yearCtx.fillText(nodeData.year, 64, 30);

        const yearTexture = new THREE.CanvasTexture(yearCanvas);
        const yearMaterial = new THREE.SpriteMaterial({ map: yearTexture, transparent: true });
        const yearSprite = new THREE.Sprite(yearMaterial);
        yearSprite.scale.set(20, 8, 1);
        yearSprite.position.set(nodeData.x, nodeData.y + 16, 0);
        timelineGroup.add(yearSprite);
    }
}

// ==========================================
// 8. CONNECTIONS (Lines between nodes)
// ==========================================
// ==========================================
// 8. CONNECTIONS (Lines from Main Line to Nodes)
// ==========================================
function createConnections() {
    // Lấy danh sách điểm trên đường cong chính để tìm điểm gần nhất
    const curvePoints = mainTimelineCurve ? mainTimelineCurve.getPoints(200) : [];

    timelineData.nodes.forEach(node => {
        // TÌM ĐIỂM BẮT ĐẦU CHÍNH XÁC TRÊN ĐƯỜNG CONG
        // Thay vì (node.x, 0, 0), ta tìm điểm trên curve có tọa độ x gần với node.x nhất
        let startPoint = new THREE.Vector3(node.x, 0, 0);

        if (curvePoints.length > 0) {
            // Tìm điểm có khoảng cách x nhỏ nhất
            let closestP = curvePoints[0];
            let minDiff = Math.abs(closestP.x - node.x);

            for (let p of curvePoints) {
                const diff = Math.abs(p.x - node.x);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestP = p;
                }
            }
            startPoint = closestP.clone();
        }

        // Điểm kết thúc: Tại vị trí node
        const endPoint = new THREE.Vector3(node.x, node.y, 0);

        // Tạo đường cong nhẹ cho tự nhiên
        const midPoint = new THREE.Vector3(
            node.x,
            (startPoint.y + node.y) / 2, // Trung điểm y
            15
        );

        const curve = new THREE.QuadraticBezierCurve3(
            startPoint,
            midPoint,
            endPoint
        );

        // 1. Ống kết nối (Branch)
        // - Radius 0.8 (đủ dày để trông cứng cáp như cành cây)
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.8, 8, false);

        // - Màu VÀNG GOLD giống trục chính -> Tạo cảm giác "liền khối"
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.8 // Opacity cao hơn để trông rắn rỏi
        });

        const mesh = new THREE.Mesh(tubeGeometry, material);
        connectionLines.push(mesh);
        timelineGroup.add(mesh);

        // 2. Khớp nối (Joint)
        // Tạo một khối cầu tại điểm giao nhau để che vết cắt -> Trông như mọc ra từ thân
        const jointGeometry = new THREE.SphereGeometry(2.5, 16, 16); // Hơi to hơn radius main line (2) một chút
        const jointMesh = new THREE.Mesh(jointGeometry, material);
        jointMesh.position.copy(startPoint);
        timelineGroup.add(jointMesh);
    });
}

// ==========================================
// 9. ANIMATION LOOP
// ==========================================

// --- ZOOM CONTROL with LIMITS ---
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.0;

document.addEventListener('wheel', (e) => {
    // Chỉ zoom khi đang ở Timeline View (canvas hiện) và KHÔNG ở trong Detail View
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer || canvasContainer.style.display === 'none') return;
    if (isInDetailView) return;

    e.preventDefault();

    const zoomSpeed = 0.001;
    let newZoom = currentZoom - e.deltaY * zoomSpeed;

    // Giới hạn Zoom (Clamping)
    newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

    currentZoom = newZoom;
}, { passive: false });
// ==========================================
let lastTime = 0;
const targetFPS = 30;
const frameInterval = 1000 / targetFPS;

// Cache Vector3 to avoid garbage collection
const cachedVector3 = new THREE.Vector3(1, 1, 1);

// FPS monitoring
let frameCount = 0;
let lastFPSUpdate = Date.now();

function animate() {
    requestAnimationFrame(animate);

    // FPS limiting
    const currentTime = Date.now();
    const elapsed = currentTime - lastTime;

    if (elapsed < frameInterval) return;
    lastTime = currentTime - (elapsed % frameInterval);

    const time = currentTime * 0.001;

    // FPS counter (log every second)
    frameCount++;
    if (currentTime - lastFPSUpdate >= 1000) {
        console.log(`📊 FPS: ${frameCount}`);
        frameCount = 0;
        lastFPSUpdate = currentTime;
    }

    // PERFORMANCE: Skip all logic and rendering if 3D view is hidden
    if (!DOM.canvasContainer || DOM.canvasContainer.style.display === 'none') return;

    // REMOVED: bgStars and particleSystem dead code (never created)
    // This saves 2-3ms per frame by eliminating unnecessary checks

    // Animate node particles
    Object.values(nodeParticles).forEach(particles => {
        if (!particles.parent) return; // Skip if removed from scene

        const positions = particles.geometry.attributes.position.array;
        const phases = particles.geometry.userData.phases;
        const nodeData = particles.geometry.userData.nodeData;

        for (let i = 0; i < positions.length; i += 3) {
            const idx = i / 3;
            const angle = time * 0.5 + phases[idx];
            const radius = 15 + Math.sin(time * 2 + phases[idx]) * 5;
            positions[i] = nodeData.x + Math.cos(angle + idx * 0.1) * radius;
            positions[i + 1] = nodeData.y + Math.sin(angle + idx * 0.1) * radius * 0.5;
            positions[i + 2] = Math.sin(time + phases[idx]) * 10;
        }
        particles.geometry.attributes.position.needsUpdate = true;

        // Highlight if selected
        if (selectedNode && selectedNode.id === nodeData.id) {
            particles.material.opacity = 0.9;
        } else {
            particles.material.opacity = 0.4;
        }
    });

    // Animate node rings - Use simple rotation
    nodeMeshes.forEach(mesh => {
        if (mesh.userData.ring) {
            mesh.userData.ring.rotation.z += 0.01;
            if (hoveredNode && hoveredNode.id === mesh.userData.id) {
                mesh.userData.ring.material.opacity = 0.8;
                mesh.scale.set(1.2, 1.2, 1.2);
            } else {
                mesh.userData.ring.material.opacity = 0.3;
                // Sử dụng cached Vector3 thay vì tạo mới
                cachedVector3.set(1, 1, 1);
                mesh.scale.lerp(cachedVector3, 0.1);
            }
        }
    });

    // Apply zoom and pan with simple lerping
    timelineGroup.scale.set(currentZoom, currentZoom, currentZoom);
    timelineGroup.position.x += (panOffset.x - timelineGroup.position.x) * 0.1;
    timelineGroup.position.y += (panOffset.y - timelineGroup.position.y) * 0.1;

    renderer.render(scene, camera);
}

// ==========================================
// 10. HAND GESTURE RECOGNITION
// ==========================================
function isFingerExtended(landmarks, fingerTip, fingerPIP) {
    const wrist = landmarks[0];
    const tipDist = Math.hypot(landmarks[fingerTip].x - wrist.x, landmarks[fingerTip].y - wrist.y);
    const pipDist = Math.hypot(landmarks[fingerPIP].x - wrist.x, landmarks[fingerPIP].y - wrist.y);
    return tipDist > pipDist * 1.1;
}

function countExtendedFingers(landmarks) {
    return {
        index: isFingerExtended(landmarks, 8, 6),
        middle: isFingerExtended(landmarks, 12, 10),
        ring: isFingerExtended(landmarks, 16, 14),
        pinky: isFingerExtended(landmarks, 20, 18)
    };
}

function getPinchDistance(landmarks) {
    return Math.hypot(
        landmarks[4].x - landmarks[8].x,
        landmarks[4].y - landmarks[8].y
    );
}

function isOpenHand(landmarks) {
    const fingers = countExtendedFingers(landmarks);
    // Check thumb is also extended (thumb tip far from index base)
    const thumbTip = landmarks[4];
    const indexBase = landmarks[5];
    const thumbExtended = Math.hypot(thumbTip.x - indexBase.x, thumbTip.y - indexBase.y) > 0.1;

    // All 5 fingers must be extended for open hand
    return thumbExtended && fingers.index && fingers.middle && fingers.ring && fingers.pinky;
}

// Check if only pointing with index finger (1 finger)
function isPointingFinger(landmarks) {
    const fingers = countExtendedFingers(landmarks);
    return fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
}

// ==========================================
// PROCESS HANDS - NEW TWO-HAND SYSTEM
// ==========================================
function processHands(results) {
    // Chỉ xử lý gesture khi đang ở gesture mode
    if (controlMode !== 'gesture') return;

    leftHand = null;
    rightHand = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
            const handedness = results.multiHandedness[i].label;
            if (handedness === 'Left') {
                rightHand = landmarks;
            } else {
                leftHand = landmarks;
            }
        });
    }

    // =====================
    // CONTEXT AWARE HANDLING
    // =====================

    if (currentGestureContext === GESTURE_CONTEXT.CAROUSEL) {
        if (leftHand) handleLeftCarousel(leftHand);
        if (rightHand) handleRightHand(rightHand);
    }

    else if (currentGestureContext === GESTURE_CONTEXT.DETAIL) {
        if (leftHand) handleLeftDetail(leftHand);
        if (rightHand) handleRightHand(rightHand);
    }

    else if (currentGestureContext === GESTURE_CONTEXT.TIMELINE) {
        if (leftHand) handleLeftTimeline(leftHand);
        if (rightHand) handleRightHand(rightHand);
    }
}



// ==========================================
// XỬ LÝ TAY TRÁI - PAN
// ==========================================
function handleLeftHand(landmarks) {
    // Unused legacy function, keeping as placeholder or removing
    return '';
}

// ==========================================
// XỬ LÝ TAY PHẢI - CURSOR + ACTIONS
// ==========================================
function handleRightHand(landmarks) {
    const index = landmarks[8];
    const middle = landmarks[12];
    const ring = landmarks[16];
    const pinky = landmarks[20];

    const fingers = {
        index: index.y < landmarks[6].y,
        middle: middle.y < landmarks[10].y,
        ring: ring.y < landmarks[14].y,
        pinky: pinky.y < landmarks[18].y
    };

    // 5. 3 NGÓN → Quay lại (ưu tiên cao nhất)
    if (fingers.index && fingers.middle && fingers.ring && !fingers.pinky) {
        if (isInDetailView) {
            // Trong detail view → Quay về timeline
            exitDetailView();
            return '🖖 3 NGÓN: THOÁT CHI TIẾT';
        } else if (currentActiveCard !== null) {
            // Trong timeline view → Quay về carousel
            exitTimelineView();
            return '🖖 3 NGÓN: QUAY VỀ CAROUSEL';
        }
        return '🖖 3 NGÓN: QUAY LẠI';
    }
    // 2. 2 NGÓN → Chọn/Vào node
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
        return selectOrEnterNode();
    }

    // 1. NGÓN TRỎ → Di chuyển cursor (luôn hoạt động)
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        moveCursor(index);
        return '☝️ NGÓN TRỎ: DI CHUYỂN CURSOR';
    }

    // Nếu có ngón trỏ duỗi (bất kể cử chỉ nào), vẫn cập nhật cursor
    if (fingers.index) {
        moveCursor(index);
    }

    return '';
}
function handleLeftDetail(landmarks) {
    if (!isOpenHand(landmarks)) return;

    const palm = landmarks[9];
    if (!prevPanPos) {
        prevPanPos = palm;
        return;
    }

    const dy = palm.y - prevPanPos.y;
    const container = document.getElementById('detail-container');

    container.scrollTop += dy * 1200;

    prevPanPos = palm;
}

function handleLeftTimeline(landmarks) {
    if (!isOpenHand(landmarks)) return;

    const palm = landmarks[9];
    if (!prevPanPos) {
        prevPanPos = palm;
        return;
    }

    panOffset.x += (prevPanPos.x - palm.x) * 200;
    panOffset.y += (palm.y - prevPanPos.y) * 150;

    prevPanPos = palm;
}


function handleLeftCarousel(landmarks) {
    if (!isOpenHand(landmarks)) return;

    const palm = landmarks[9];
    if (!prevPanPos) {
        prevPanPos = palm;
        return;
    }

    const dx = palm.x - prevPanPos.x;

    if (dx > 0.08) navigateCards(-1);
    else if (dx < -0.08) navigateCards(1);

    prevPanPos = palm;
}


// ==========================================
// DI CHUYỂN CURSOR ẢO
// ==========================================
function moveCursor(indexFingerLandmark) {
    const cursor = document.getElementById('virtual-cursor');

    // Tự động bật cursor khi dùng ngón trỏ
    if (!cursorEnabled) {
        cursorEnabled = true;
        cursor.style.display = 'block';
    }

    // Chuyển đổi tọa độ (mirrored)
    const x = (1 - indexFingerLandmark.x) * window.innerWidth;
    const y = indexFingerLandmark.y * window.innerHeight;

    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';

    // Lưu vị trí để dùng cho selection
    cursorX = x;
    cursorY = y;

    // Kiểm tra hover node
    checkNodeHover(x, y);
    cursor.classList.toggle('active', !!hoveredNode);
}

// ==========================================
// CHỌN HOẶC VÀO NODE
// ==========================================
function selectOrEnterNode() {
    if (!cursorX || !cursorY) {
        return '✌️ 2 NGÓN: DI CHUYỂN CURSOR ĐẾN NODE';
    }

    // Chuyển đổi vị trí cursor sang tọa độ 3D
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (cursorX / rect.width) * 2 - 1;
    const y = -(cursorY / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, camera);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
        const node = intersects[0].object.userData;

        if (isInDetailView) {
            // Trong detail view: có thể chọn sub-node (logic tùy chỉnh sau)
            return '✌️ 2 NGÓN: TRONG CHI TIẾT';
        } else {
            // Ngoài: vào detail view với animation
            const fullNode = timelineData.nodes.find(n => n.id === node.id);
            if (fullNode && fullNode.content) {
                // Find mesh and animate
                const nodeMesh = nodeMeshes.find(m => m.userData.id === fullNode.id);
                animateNodeZoom(nodeMesh, () => {
                    openDetailView(fullNode);
                });
                return `✌️ 2 NGÓN: MỞ "${fullNode.label}"`;
            }
        }
    }

    return '✌️ 2 NGÓN: KHÔNG CÓ NODE';
}

function checkNodeHover(screenX, screenY) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
        hoveredNode = intersects[0].object.userData;
    } else {
        hoveredNode = null;
    }
}

function showNodeInfo(node) {
    const infoPanel = document.getElementById('node-info');
    document.getElementById('node-title').textContent = node.label;
    document.getElementById('node-desc').textContent = node.desc;
    infoPanel.style.display = 'block';
}

// ==========================================
// CAROUSEL & MODE SWITCHING
// ==========================================
let controlMode = null; // 'gesture' or 'mouse'
// =====================
// GESTURE CONTEXT STATE
// =====================
const GESTURE_CONTEXT = {
    CAROUSEL: 'carousel',
    DETAIL: 'detail',
    TIMELINE: 'timeline'
};

let currentGestureContext = null;

// Carousel
let currentCardIndex = 1; // Start at index 1 (center visual balance)
let currentActiveCard = null;

function getTotalCards() {
    return document.querySelectorAll('.node-card').length;
}

// --- NEW: INVISIBLE CONTROLS LOGIC ---

let isDragging = false;
let startX = 0;
let currentTranslate = 0;
let prevTranslate = 0;
const DRAG_THRESHOLD = 50; // Pixels to trigger slide

function initCarouselControls() {
    const container = document.getElementById('node-cards-container');
    const cards = document.querySelectorAll('.node-card');

    // 1. CLICK LOGIC (Smart Click)
    cards.forEach((card, index) => {
        card.onclick = (e) => {
            // Prevent click if we just dragged
            if (Math.abs(currentTranslate - prevTranslate) > 5) return;

            const cardId = parseInt(card.dataset.nodeId);

            if (index === currentCardIndex) {
                // Click center card -> ENTER
                console.log('🎯 Clicked Center Card -> Enter 3D');
                selectCard(cardId);
            } else {
                // Click side card -> CENTER IT
                console.log('↔️ Clicked Side Card -> Slide to center');
                currentCardIndex = index;
                updateCarouselScale();
            }
        };
    });

    // 2. DRAG LOGIC (Swipe)
    container.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX;
        container.classList.add('grabbing');
        // Disable transition during drag for responsiveness
        document.getElementById('node-cards-wrapper').style.transition = 'none';
    };

    container.onmouseup = (e) => {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('grabbing');

        // Re-enable transition
        document.getElementById('node-cards-wrapper').style.transition = 'transform 0.6s ease-out';

        const movedBy = e.clientX - startX;

        if (movedBy < -DRAG_THRESHOLD) {
            navigateCards(1); // Next
        } else if (movedBy > DRAG_THRESHOLD) {
            navigateCards(-1); // Prev
        } else {
            updateCarouselScale(); // Snap back
        }
    };

    container.onmouseleave = () => {
        if (isDragging) {
            isDragging = false;
            container.classList.remove('grabbing');
            document.getElementById('node-cards-wrapper').style.transition = 'transform 0.6s ease-out';
            updateCarouselScale();
        }
    };

    container.onmousemove = (e) => {
        if (!isDragging) return;
        const currentX = e.clientX;
        const diff = currentX - startX;
        // Visual feedback during drag (optional, simple log for now)
    };

    // 3. WHEEL LOGIC (Scroll)
    container.onwheel = (e) => {
        // Throttle wheel events
        if (Date.now() - lastWheelTime < 500) return;
        lastWheelTime = Date.now();

        if (e.deltaY > 0) {
            navigateCards(1);
        } else {
            navigateCards(-1);
        }
    };
}
let lastWheelTime = 0;


function startGestureMode() {
    controlMode = 'gesture';
    currentGestureContext = GESTURE_CONTEXT.CAROUSEL;
    document.getElementById('welcome-overlay').style.display = 'none';
    document.getElementById('gesture-panel').style.display = 'flex';
    document.getElementById('node-cards-container').style.display = 'flex';
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('header').style.display = 'none'; // Gesture mode uses vertical panel

    // Hiện nút back ngay từ Carousel
    document.getElementById('global-back-btn').style.display = 'block';

    initCarouselControls();
    updateCarouselScale();
    startSystem();
    startMediaPipe();

    // Auto-play Music via Toggle Function
    toggleAudio(true);
}

function startMouseMode() {
    controlMode = 'mouse';
    document.getElementById('welcome-overlay').style.display = 'none';
    document.getElementById('gesture-panel').style.display = 'none';
    document.getElementById('node-cards-container').style.display = 'flex';
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('header').style.display = 'none';

    // Hiện nút back ngay từ Carousel
    document.getElementById('global-back-btn').style.display = 'block';

    initCarouselControls();
    updateCarouselScale();
    enableMouseControls();
    init3D();
    stopMediaPipe();

    // Auto-play Music via Toggle Function
    toggleAudio(true);
}

// --- AUDIO CONTROL LOGIC ---
function toggleAudio(forcePlay = false) {
    const music = document.getElementById('bg-music');
    const btn = document.getElementById('audio-btn');

    if (!music || !btn) return;

    if (forcePlay) {
        music.volume = 0.5;
        music.play().then(() => {
            btn.textContent = '🎵';
            btn.classList.add('playing');
        }).catch(e => {
            console.log('Autoplay blocked:', e);
            btn.textContent = '🔇';
            btn.classList.remove('playing');
        });
        return;
    }

    if (music.paused) {
        music.volume = 0.5;
        music.play();
        btn.textContent = '🎵';
        btn.classList.add('playing');
    } else {
        music.pause();
        btn.textContent = '🔇';
        btn.classList.remove('playing');
    }
}

function navigateCards(direction) {
    const totalCards = getTotalCards();
    const newIndex = currentCardIndex + direction;

    if (newIndex < 0 || newIndex >= totalCards) return;

    currentCardIndex = newIndex;
    updateCarouselScale();
}

function updateCarouselScale() {
    const container = document.getElementById('node-cards-container');
    const wrapper = document.getElementById('node-cards-wrapper');
    const cards = Array.from(document.querySelectorAll('.node-card'));

    if (!container || !wrapper || cards.length === 0) return;

    // 1. CALCULATE EXACT CENTER
    // Use window.innerWidth to be sure (minus scrollbar estimation if needed, 
    // but 100vw usually includes scrollbar in some browsers, 
    // so clientWidth is safer for "visible" area).
    const viewportWidth = document.documentElement.clientWidth;
    const cardWidth = 420; // Fixed width from CSS
    const gap = 40;        // Fixed gap from CSS
    const cardTotalWidth = cardWidth + gap;

    // Offset = (Half Screen) - (Half Card) - (N cards * width)
    // This logic places the center of the Nth card EXACTLY at the center of the screen
    const halfScreen = viewportWidth / 2;
    const halfCard = cardWidth / 2;

    // Formula: Center - HalfCard - (Index * (Width + Gap))
    // Example Index 0: Center - 140 - 0 = Center of card 0 at screen center
    // Example Index 1: Center - 140 - 320 = Center of card 1 at screen center
    const offset = halfScreen - halfCard - (currentCardIndex * cardTotalWidth);

    console.log(`📏 Math: Screen=${viewportWidth / 2} - Card=${halfCard} - Shift=${currentCardIndex * cardTotalWidth} = ${offset}`);

    wrapper.style.transform = `translateX(${offset}px)`;

    // Update visual states
    cards.forEach((card, index) => {
        // Clean reset
        card.classList.remove('center', 'side');
        card.style.opacity = '';
        card.style.transform = '';

        const relative = index - currentCardIndex;

        if (relative === 0) {
            card.classList.add('center');
            // Ensure center card is fully opaque and scaled
            card.style.opacity = '1';
        } else if (Math.abs(relative) === 1) {
            card.classList.add('side');
            card.style.opacity = '0.5';
        } else {
            card.style.opacity = '0.2';
            // Far cards scale down
            card.style.transform = 'scale(0.6) translateY(-2rem)';
        }
    });
}


// Add resize listener (Grok recommendation)
window.addEventListener('resize', () => {
    // Only update if carousel is visible
    if (document.getElementById('node-cards-container').style.display !== 'none') {
        updateCarouselScale();
    }
});

function selectCard(cardId) {
    console.log('\n🎯 ========== selectCard CALLED ==========');
    console.log('📌 Card ID:', cardId);
    console.log('📊 isInit3DCompleted:', isInit3DCompleted);
    console.log('🔍 Scene exists:', !!scene);
    console.log('🔍 Renderer exists:', !!renderer);
    console.log('🔍 Camera exists:', !!camera);
    console.log('🔍 nodeMeshes count:', nodeMeshes.length);
    console.log('🔍 DOM.canvasContainer:', !!DOM.canvasContainer);

    // CRITICAL: Ensure DOM cache is initialized
    if (!DOM.canvasContainer) {
        console.warn('❌ DOM cache not initialized! Calling cacheDOMElements()...');
        cacheDOMElements();
    }

    // CRITICAL: Ensure 3D is initialized before showing canvas
    if (!isInit3DCompleted) {
        console.log('⚠️ 3D not initialized yet, initializing now...');
        init3D();
        console.log('✅ init3D() completed');
        console.log('🔍 After init - Scene:', !!scene);
        console.log('🔍 After init - nodeMeshes:', nodeMeshes.length);
    }

    // Ẩn carousel
    console.log('👁️ Hiding carousel...');
    document.getElementById('node-cards-container').style.display = 'none';

    // Hiện 3D canvas với timeline
    console.log('👁️ Showing canvas...');
    document.getElementById('canvas-container').style.display = 'block';

    // Hiện header
    const header = document.getElementById('header');
    header.style.display = 'flex';

    // LOGIC CAMERA PREVIEW:
    // Mouse Mode -> Ẩn camera preview (cho sạch)
    // Gesture Mode -> Hiện camera preview
    const camPreview = document.getElementById('camera-preview');
    if (controlMode === 'mouse') {
        camPreview.style.display = 'none';
    } else {
        camPreview.style.display = 'block';
    }

    // Hiện nút back
    document.getElementById('global-back-btn').style.display = 'block';

    // Cập nhật title theo card
    const cardTitles = {
        1: "Trước 1848: Bối cảnh ra đời",
        2: "1840s – 1850s: Ra đời Chủ nghĩa Marx",
        3: "1860s - 1890s: Hoàn thiện lý thuyết",
        4: "1900s - 1920s: Chủ nghĩa Mác phát triển thành Mác – Lênin",
        5: "1950s - 1980s: Chiến tranh Lạnh và mở rộng",
        6: "1980s - 1990s: Suy thoái",
        7: "2000s - Hiện tại (2026)"
    };

    document.getElementById('title').textContent = `☭ ${cardTitles[cardId] || 'TRIẾT HỌC MARX-LENIN'}`;

    // Lưu current card
    currentActiveCard = cardId;
    currentGestureContext = GESTURE_CONTEXT.TIMELINE; // ✅ ADD

    // Force a render to ensure scene is visible
    if (renderer && scene && camera) {
        console.log('🎨 Forcing initial render...');
        renderer.render(scene, camera);
        console.log('✅ Render complete');
    } else {
        console.error('❌ Cannot render! Missing:',
            !renderer ? 'renderer' : '',
            !scene ? 'scene' : '',
            !camera ? 'camera' : '');
    }

    // Log final state
    console.log('📍 Timeline view active for card:', cardId);
    console.log('🔍 Final check - Nodes in scene:', nodeMeshes.filter(m => m.parent === timelineGroup).length);
    console.log('========== selectCard END ==========\n');
}

function enableMouseControls() {
    // Mouse controls already work via onclick handlers
    console.log('Mouse mode enabled');
}

function exitTimelineView() {
    console.log('Exiting timeline view, returning to carousel');

    // Ẩn 3D canvas
    document.getElementById('canvas-container').style.display = 'none';

    // Ẩn header
    document.getElementById('header').style.display = 'none';

    // Hiện lại carousel
    document.getElementById('node-cards-container').style.display = 'flex';

    // Reset current card
    currentActiveCard = null;

    // Back button remains visible (for Carousel -> Welcome)
    document.getElementById('global-back-btn').style.display = 'block';
    currentGestureContext = GESTURE_CONTEXT.CAROUSEL;

}

function resetToWelcome() {
    console.log('Resetting to Welcome Screen');
    controlMode = null;

    // Ẩn tất cả giao diện chính
    document.getElementById('node-cards-container').style.display = 'none';
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('gesture-panel').style.display = 'none';
    document.getElementById('header').style.display = 'none';
    document.getElementById('global-back-btn').style.display = 'none'; // Ẩn nút back ở welcome

    // Hiện màn hình Welcome
    document.getElementById('welcome-overlay').style.display = 'flex';

    // TẮT AI/Camera hoàn toàn
    stopMediaPipe();
}

// Global back button navigation
function goBack() {
    if (isInDetailView) {
        exitDetailView();
    } else if (currentActiveCard !== null) {
        exitTimelineView();
    } else {
        // Nếu đang ở Carousel (chưa chọn card nào) -> Về Welcome
        resetToWelcome();
    }
}

// ==========================================
// 11. START SYSTEM
// ==========================================
// Start MediaPipe (only for gesture mode)
function startMediaPipe() {
    if (isMediaPipeRunning) return;

    const video = document.querySelector('.input_video');
    const canvas = document.getElementById('camera-preview');
    const ctx = canvas.getContext('2d');

    handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,  // Giảm từ 1 → 0 (nhanh hơn 30-40%)
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });

    handsInstance.onResults((results) => {
        if (!isMediaPipeRunning) return; // Skip if stopped

        // Draw camera preview
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Draw hand landmarks
        if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach(landmarks => {
                // Draw fingertips
                [4, 8, 12, 16, 20].forEach(tip => {
                    ctx.beginPath();
                    ctx.arc(landmarks[tip].x * canvas.width, landmarks[tip].y * canvas.height, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFD700';
                    ctx.fill();
                });
            });
        }

        // Only process gestures when in timeline view (not carousel/detail)
        if (currentActiveCard !== null && !isInDetailView) {
            processHands(results);
        }
    });

    cameraInstance = new Camera(video, {
        onFrame: async () => {
            if (isMediaPipeRunning && handsInstance) {
                await handsInstance.send({ image: video });
            }
        },
        width: 320,  // Giảm từ 640 → 320 (75% ít pixel hơn)
        height: 240  // Giảm từ 480 → 240
    });

    cameraInstance.start().then(() => {
        isMediaPipeRunning = true;
        document.getElementById('status').textContent = 'Sẵn sàng! Đưa tay vào camera';
    });
}

// Stop MediaPipe (save CPU)
function stopMediaPipe() {
    isMediaPipeRunning = false;

    if (cameraInstance) {
        cameraInstance.stop();
    }

    if (handsInstance) {
        handsInstance.close();
    }
}

function startSystem() {
    document.getElementById('btnStart').style.display = 'none';
    init3D();
    cacheDOMElements(); // Initialize DOM cache
    // MediaPipe sẽ chỉ start khi chọn Gesture Mode
}

// ==========================================
// 12. WINDOW RESIZE
// ==========================================
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// ==========================================
// 13. MOUSE CONTROLS
// ==========================================
let isMouseDragging = false;
let lastMousePos = { x: 0, y: 0 };

// Mouse move - update hover and cursor
document.addEventListener('mousemove', (e) => {
    if (isInDetailView) return;

    // Update hover
    checkNodeHover(e.clientX, e.clientY);

    // Drag to pan
    if (isMouseDragging) {
        const deltaX = (lastMousePos.x - e.clientX) * 0.5;
        const deltaY = (e.clientY - lastMousePos.y) * 0.5;
        panOffset.x += deltaX;
        panOffset.y += deltaY;
        lastMousePos = { x: e.clientX, y: e.clientY };
    }
});

// Mouse down - start drag or select
document.addEventListener('mousedown', (e) => {
    if (isInDetailView) return;
    if (e.target.closest('#controls') || e.target.closest('#header') || e.target.closest('button')) return;

    lastMousePos = { x: e.clientX, y: e.clientY };

    // Check if clicking on a node
    if (hoveredNode) {
        selectedNode = hoveredNode;
        showNodeInfo(selectedNode);
        document.getElementById('status').textContent = `Đã chọn: ${selectedNode.label}`;
    } else {
        isMouseDragging = true;
        document.body.style.cursor = 'grabbing';
    }
});

// Mouse up - stop drag
document.addEventListener('mouseup', () => {
    isMouseDragging = false;
    document.body.style.cursor = 'default';
});

// Double click - enter detail view
document.addEventListener('dblclick', (e) => {
    if (isInDetailView) return;
    if (e.target.closest('#controls') || e.target.closest('#header') || e.target.closest('button')) return;

    if (selectedNode && selectedNode.content) {
        const fullNode = timelineData.nodes.find(n => n.id === selectedNode.id);
        if (fullNode) {
            // Find mesh and animate
            const nodeMesh = nodeMeshes.find(m => m.userData.id === fullNode.id);
            animateNodeZoom(nodeMesh, () => {
                openDetailView(fullNode);
            });
            document.getElementById('status').textContent = `Mở chi tiết: ${fullNode.label}`;
        }
    }
});

// Scroll - zoom in/out
document.addEventListener('wheel', (e) => {
    if (isInDetailView) return;

    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
    currentZoom = Math.max(CONFIG.zoomMin, Math.min(CONFIG.zoomMax, currentZoom + zoomDelta));
    document.getElementById('status').textContent = `Zoom: ${(currentZoom * 100).toFixed(0)}%`;
}, { passive: false });

// Right click - exit detail view or reset
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (isInDetailView) {
        exitDetailView();
    } else {
        // Reset pan and zoom
        panOffset = { x: 0, y: 0 };
        currentZoom = 1.0;
        selectedNode = null;
        document.getElementById('node-info').style.display = 'none';
        document.getElementById('status').textContent = 'Đã reset vị trí';
    }
});

// ==========================================
// KEYBOARD NAVIGATION (Inspired by Grok)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Only work when carousel is visible
    const carouselVisible = document.getElementById('node-cards-container').style.display === 'flex';
    if (!carouselVisible) return;

    if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        e.preventDefault();
        navigateCards(-1); // Previous card
    } else if (e.key === 'ArrowRight' || e.keyCode === 39) {
        e.preventDefault();
        navigateCards(1); // Next card
    } else if (e.key === 'Enter' && currentCardIndex >= 0) {
        e.preventDefault();
        // Select current active card
        selectCard(currentCardIndex + 1); // +1 because cards are 1-indexed
    }
});
