// ==================================================
// --- CẤU HÌNH CÂN BẰNG (QUALITY vs PERFORMANCE) ---
// ==================================================
const isMobile = window.innerWidth < 768;

const CONFIG = {
    photoCount: 6,        // Giữ 6 ảnh
    // --- CẮT GIẢM SỐ LƯỢNG ĐỂ BÙ CHO ĐỘ PHÂN GIẢI CAO ---
    snowCount: 50,        // Rất ít tuyết, nhưng sẽ làm hạt to hơn
    groundCount: 80,      // Ít điểm nền hơn
    treeSteps: 180,       // Giảm chi tiết cây một chút để nhẹ máy
    // ----------------------------------------------------
    fallSpeed: 0.8,
    FPS_LIMIT: 30,        // Khóa 30 FPS là bắt buộc để tránh nóng máy
    RENDER_SCALE: 1.0     // YÊU CẦU CỦA BẠN: Giữ nguyên phân giải nét nhất
};

// --- QUẢN LÝ VIDEO ---
const bgMusic = document.getElementById('bg-music');
const introVideo = document.getElementById('intro-video');

document.getElementById('btn-ready').addEventListener('click', () => {
    document.getElementById('layer-start').classList.remove('active-layer');
    document.getElementById('layer-video').classList.remove('hidden');
    document.getElementById('layer-video').classList.add('active-layer');
    introVideo.play();
    bgMusic.play().catch(()=>{});
    
    introVideo.onended = () => {
        document.getElementById('layer-video').classList.remove('active-layer');
        document.getElementById('layer-video').classList.add('hidden');
        document.getElementById('layer-gift').classList.remove('hidden');
        document.getElementById('layer-gift').classList.add('active-layer');
    };
});

document.getElementById('gift-box').addEventListener('click', () => {
    document.getElementById('letter-wrapper').classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-next').classList.remove('hidden'), 1500);
});

document.getElementById('btn-next').addEventListener('click', () => {
    document.getElementById('layer-gift').classList.remove('active-layer');
    document.getElementById('layer-gift').classList.add('hidden');
    const layer3D = document.getElementById('layer-3d');
    layer3D.classList.remove('hidden');
    layer3D.classList.add('active-layer');
    
    // Tạo nền mờ cho focus mode
    const dim = document.createElement('div');
    dim.id = 'overlay-dim';
    layer3D.appendChild(dim);
    dim.addEventListener('click', closeFocusedPhoto);
    
    initTrue3DWorld();
});

// ==================================================
// --- 3D ENGINE ---
// ==================================================

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

// Hàm resize cho độ phân giải full
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Không cần ctx.scale vì RENDER_SCALE là 1.0
}
window.addEventListener('resize', resize);
resize();

// --- BIẾN CAMERA ---
let cameraAngleY = 0;
let cameraZ = 200; 
let minZoom = -500; 
let maxZoom = 1000; 

// --- BIẾN ĐIỀU KHIỂN ---
let lastTouchX = 0;
let initialPinchDist = 0;
let isDraggingWorld = false;
let autoRotateSpeed = 0.002; 

// --- BIẾN FOCUS ẢNH ---
let focusedPhoto = null; 
let isDraggingPhoto = false;
let photoDragOffsetX = 0;
let photoDragOffsetY = 0;

// Data Pools (Dùng mảng phẳng Float32Array sẽ nhanh hơn nữa nhưng phức tạp, mảng thường là đủ cho số lượng ít này)
const treeData = [];
const snowData = [];
const groundData = [];
const domObjects = [];

function initTrue3DWorld() {
    const container = document.getElementById('dom-objects');
    container.innerHTML = '';
    treeData.length = 0; snowData.length = 0; groundData.length = 0; domObjects.length = 0;

    createTree(); createSnow(); createGround(); createPhotos();

    const scene = document.getElementById('layer-3d');

    // --- SỰ KIỆN CHÍNH (TOUCH) ---
    scene.addEventListener('touchstart', e => {
        if (focusedPhoto) return;
        if (e.touches.length === 1) {
            isDraggingWorld = true;
            lastTouchX = e.touches[0].clientX;
        } else if (e.touches.length === 2) {
            isDraggingWorld = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist = Math.hypot(dx, dy);
        }
    }, {passive: false});

    scene.addEventListener('touchmove', e => {
        e.preventDefault(); 
        if (focusedPhoto) return; 

        if (e.touches.length === 1 && isDraggingWorld) {
            const delta = e.touches[0].clientX - lastTouchX;
            cameraAngleY += delta * 0.005; 
            lastTouchX = e.touches[0].clientX;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.hypot(dx, dy);
            const diff = initialPinchDist - currentDist;
            cameraZ += diff * 1.0; 
            cameraZ = Math.max(minZoom, Math.min(maxZoom, cameraZ));
            initialPinchDist = currentDist; 
        }
    }, {passive: false});

    scene.addEventListener('touchend', () => { isDraggingWorld = false; });

    // Mouse PC
    scene.addEventListener('mousedown', e => { if(!focusedPhoto) { isDraggingWorld = true; lastTouchX = e.clientX; } });
    window.addEventListener('mouseup', () => { isDraggingWorld = false; });
    window.addEventListener('mousemove', e => {
        if (!isDraggingWorld || focusedPhoto) return;
        const delta = e.clientX - lastTouchX;
        cameraAngleY += delta * 0.005;
        lastTouchX = e.clientX;
    });
    scene.addEventListener('wheel', (e) => {
        if (focusedPhoto) return;
        cameraZ += e.deltaY * 0.5;
        cameraZ = Math.max(minZoom, Math.min(maxZoom, cameraZ));
    }, {passive: true});

    requestAnimationFrame(renderLoop);
}

// --- LOGIC ẢNH ---
function handlePhotoInteraction(div, objData) {
    div.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (focusedPhoto === objData) {
            closeFocusedPhoto(); 
        } else {
            openFocusedPhoto(div, objData); 
        }
    });

    const dragStart = (clientX, clientY) => {
        if (focusedPhoto === objData) {
            isDraggingPhoto = true;
            photoDragOffsetX = clientX;
            photoDragOffsetY = clientY;
        }
    };
    
    div.addEventListener('touchstart', (e) => {
        dragStart(e.touches[0].clientX, e.touches[0].clientY);
        e.stopPropagation();
    }, {passive: false});

    div.addEventListener('mousedown', (e) => {
        dragStart(e.clientX, e.clientY);
        e.stopPropagation();
    });
    
    window.addEventListener('touchmove', (e) => {
        if (isDraggingPhoto && focusedPhoto === objData) {
            updatePhotoPosition(div, e.touches[0].clientX, e.touches[0].clientY);
        }
    }, {passive: false});

    window.addEventListener('mousemove', (e) => {
        if (isDraggingPhoto && focusedPhoto === objData) {
            updatePhotoPosition(div, e.clientX, e.clientY);
        }
    });

    window.addEventListener('touchend', () => { isDraggingPhoto = false; });
    window.addEventListener('mouseup', () => { isDraggingPhoto = false; });
}

function updatePhotoPosition(div, clientX, clientY) {
    div.style.left = clientX + 'px';
    div.style.top = clientY + 'px';
}

function openFocusedPhoto(div, objData) {
    if (focusedPhoto) closeFocusedPhoto(); 
    focusedPhoto = objData;
    div.classList.add('focused');
    document.getElementById('overlay-dim').classList.add('active');
    div.style.left = '50%';
    div.style.top = '50%';
    div.style.transform = 'translate(-50%, -50%) scale(1)';
    objData.isPaused = true;
}

function closeFocusedPhoto() {
    if (!focusedPhoto) return;
    const div = focusedPhoto.element;
    div.classList.remove('focused');
    document.getElementById('overlay-dim').classList.remove('active');
    div.style.left = '';
    div.style.top = '';
    focusedPhoto.isPaused = false;
    focusedPhoto = null;
    isDraggingPhoto = false;
}

// --- TẠO DATA (ĐÃ CHỈNH SỬA CÂY TO & ĐẸP) ---
function createTree() {
    for (let i = 0; i < CONFIG.treeSteps; i++) {
        const p = i / CONFIG.treeSteps;
        // Cây to hơn: Đáy 350
        const r = 350 * Math.pow(1 - p, 0.8);
        // Cây cao hơn và căn giữa: Từ y=450 xuống y=-450
        const y = 450 - (900 * p);
        const angle = i * 0.2;
        // Điểm vẽ to hơn chút để bù cho số lượng ít
        treeData.push(Math.cos(angle)*r, y|0, Math.sin(angle)*r, Math.random()*3.5+2.5);
    }
}
function createSnow() {
    for (let i = 0; i < CONFIG.snowCount; i++) {
        const a = Math.random()*6.28, r = 100+Math.random()*900;
        // Hạt tuyết to hơn để dễ thấy
        snowData.push(Math.cos(a)*r, (Math.random()-0.5)*2000, Math.sin(a)*r, Math.random()*3+2, 1+Math.random());
    }
}
function createGround() {
    for (let i = 0; i < CONFIG.groundCount; i++) {
        const a = Math.random()*6.28, d = Math.pow(Math.random(), 2), r = d*1200;
        groundData.push(Math.cos(a)*r, 460+Math.random()*20, Math.sin(a)*r, (Math.random()*6+4)*(1-d*0.5));
    }
}
function createPhotos() {
    const container = document.getElementById('dom-objects'); 
    const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg', 'assets/photo4.jpg', 'assets/photo5.jpg', 'assets/photo6.jpg'
                    , 'assets/photo7.jpg', 'assets/photo8.jpg', 'assets/photo9.jpg', 'assets/photo10.jpg'
    ];
    for(let i=0; i < 15; i++) {
        const div = document.createElement('div'); div.className = 'photo-item';
        div.style.backgroundImage = `url(${images[i % images.length]})`;
        container.appendChild(div);
        const a = Math.random()*6.28; const r = 500+Math.random()*600;
        const objData = { element: div, x: Math.cos(a)*r, y:((Math.random()-0.5)*1500)|0, z:Math.sin(a)*r, speed:0.5+Math.random()*0.5, isPaused: false };
        domObjects.push(objData);
        handlePhotoInteraction(div, objData);
    }
}

// --- RENDER LOOP (VẼ XEN KẼ) ---
let lastTime = 0; 
const fpsInterval = 1000 / CONFIG.FPS_LIMIT;
let frameCount = 0; 

function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);
    const elapsed = timestamp - lastTime;
    if (elapsed < fpsInterval) return; 
    lastTime = timestamp - (elapsed % fpsInterval);

    frameCount++;
    
    // --- BƯỚC 1: TÍNH TOÁN VỊ TRÍ CHUNG ---
    if (!isDraggingWorld && !focusedPhoto && window.innerWidth > window.innerHeight) cameraAngleY += autoRotateSpeed;
    if (Math.abs(cameraAngleY) > 100) cameraAngleY %= 6.28;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const fov = 600; 
    const cos = Math.cos(cameraAngleY), sin = Math.sin(cameraAngleY);
    const w = window.innerWidth, h = window.innerHeight;

    // --- BƯỚC 2: VẼ CANVAS (Chạy mỗi frame) ---
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, w, h); // Xóa màn hình full độ phân giải

    // Cây (Vẽ bằng hình vuông cho nhanh nhất)
    ctx.fillStyle = '#00ccff'; ctx.beginPath();
    for (let i = 0; i < treeData.length; i+=4) {
        const x = treeData[i], y = treeData[i+1], z = treeData[i+2], s = treeData[i+3];
        const rz = x*sin + z*cos; const scale = fov / (fov + rz + cameraZ); 
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx, y2d = y*scale + cy;
            ctx.rect(x2d|0, y2d|0, s*scale, s*scale);
        }
    }
    ctx.fill(); 

    // Tuyết & Nền (Vẽ hình vuông)
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let i = 0; i < snowData.length; i+=5) {
        let y = snowData[i+1]; y += snowData[i+4] * CONFIG.fallSpeed; if(y > 1000) y = -1000; snowData[i+1] = y;
        const x = snowData[i], z = snowData[i+2], s = snowData[i+3];
        const rz = x*sin + z*cos; const scale = fov / (fov + rz + cameraZ);
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx, y2d = y*scale + cy, sz = s*scale;
            if (x2d>0 && x2d<w && y2d>0 && y2d<h) ctx.rect(x2d|0, y2d|0, sz, sz);
        }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < groundData.length; i+=4) {
        const x = groundData[i], y = groundData[i+1], z = groundData[i+2], s = groundData[i+3];
        const rz = x*sin + z*cos; const scale = fov / (fov + rz + cameraZ);
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx, y2d = y*scale + cy, sz = s*scale;
            if (x2d>-50 && x2d<w+50 && y2d>0 && y2d<h) ctx.rect(x2d|0, y2d|0, sz, sz);
        }
    }
    ctx.fill();

    // --- BƯỚC 3: CẬP NHẬT DOM (ẢNH) - CHỈ CHẠY Ở FRAME LẺ ---
    // Giảm tải cập nhật DOM
    if (frameCount % 2 !== 0) return; 

    for (let obj of domObjects) {
        if (obj === focusedPhoto) continue;
        if (!obj.isPaused) { obj.y += obj.speed * CONFIG.fallSpeed; if(obj.y > 1000) obj.y = -1000; }
        
        const rz = obj.x*sin + obj.z*cos; 
        const scale = fov / (fov + rz + cameraZ); 

        if (scale > 0) {
            const x2d = (obj.x*cos - obj.z*sin)*scale + cx;
            const y2d = obj.y*scale + cy;
            // Sử dụng làm tròn số |0 để tối ưu
            obj.element.style.transform = `translate3d(${x2d|0}px, ${y2d|0}px, 0) scale(${scale.toFixed(2)})`;
            obj.element.style.zIndex = (scale*100)|0; 
            obj.element.style.opacity = scale > 1.2 ? 1 : scale;
            if(obj.element.style.display==='none') obj.element.style.display='block';
        } else if(obj.element.style.display!=='none') obj.element.style.display='none';
    }
}