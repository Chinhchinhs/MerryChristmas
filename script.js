// ==================================================
// --- CẤU HÌNH ---
// ==================================================
const CONFIG = {
    photoCount: 8,        
    snowCount: 300,       
    groundCount: 500,     
    treeSteps: 250,       // Tăng nhẹ số điểm để cây to trông dày hơn
    fallSpeed: 1.0,       
    FPS_LIMIT: 40         
};

// --- QUẢN LÝ VIDEO & NHẠC (GIỮ NGUYÊN) ---
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
    
    initTrue3DWorld();
});

// ==================================================
// --- 3D ENGINE (BATCH RENDERING + GLOW) ---
// ==================================================

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

const dpr = 1; 
function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

let cameraAngleY = 0;
let lastMouseX = 0;
let isDragging = false;
let autoRotateSpeed = 0.002; 

const treeData = [];
const snowData = [];
const groundData = [];
const domObjects = [];

function initTrue3DWorld() {
    treeData.length = 0;
    snowData.length = 0;
    groundData.length = 0;
    domObjects.length = 0;

    createTree();
    createSnow();
    createGround();
    createPhotos();

    const scene = document.getElementById('layer-3d');
    
    scene.addEventListener('pointerdown', e => {
        isDragging = true;
        lastMouseX = e.clientX;
        scene.setPointerCapture(e.pointerId);
    }, {passive: true});

    scene.addEventListener('pointerup', e => {
        isDragging = false;
        scene.releasePointerCapture(e.pointerId);
    }, {passive: true});

    scene.addEventListener('pointermove', e => {
        if (!isDragging) return;
        const delta = e.clientX - lastMouseX;
        cameraAngleY += delta * 0.005; 
        lastMouseX = e.clientX;
    }, {passive: true});

    requestAnimationFrame(renderLoop);
}

// --- HÀM TẠO DỮ LIỆU (ĐÃ CHỈNH SỬA CÂY TO HƠN) ---
function createTree() {
    const steps = CONFIG.treeSteps;
    for (let i = 0; i < steps; i++) {
        const p = i / steps;
        // Tăng bán kính đáy từ 220 lên 320
        const r = 320 * Math.pow(1 - p, 0.8);
        // Tăng chiều cao: từ đáy 400 lên đỉnh -400 (tổng cao 800)
        const y = 400 - (800 * p);
        const angle = i * 0.2;
        treeData.push({
            x: Math.cos(angle) * r,
            y: y | 0,
            z: Math.sin(angle) * r,
            // Hạt to nhỏ ngẫu nhiên để hiệu ứng phun sơn đẹp hơn
            size: Math.random() * 3 + 2 
        });
    }
}

function createSnow() {
    for (let i = 0; i < CONFIG.snowCount; i++) {
        const angle = Math.random() * 6.28;
        const radius = 100 + Math.random() * 900;
        snowData.push({
            x: Math.cos(angle) * radius,
            y: (Math.random() - 0.5) * 2000,
            z: Math.sin(angle) * radius,
            size: Math.random() * 2 + 1,
            speed: 1 + Math.random()
        });
    }
}

function createGround() {
    for (let i = 0; i < CONFIG.groundCount; i++) {
        const angle = Math.random() * 6.28;
        const dist = Math.pow(Math.random(), 2);
        const radius = dist * 1100; // Mở rộng nền theo cây
        groundData.push({
            x: Math.cos(angle) * radius,
            y: 410 + Math.random() * 20, // Hạ thấp nền xuống theo cây
            z: Math.sin(angle) * radius,
            size: (Math.random() * 5 + 3) * (1 - dist * 0.5)
        });
    }
}

function createPhotos() {
    const container = document.getElementById('dom-objects');
    container.innerHTML = ''; 
    const images = [
        'assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg',
        'assets/photo4.jpg', 'assets/photo5.jpg', 'assets/photo6.jpg',
        'assets/photo7.jpg', 'assets/photo8.jpg', 'assets/photo9.jpg', 
        'assets/photo10.jpg'
    ];

    for(let i=0; i < 15; i++) {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.style.backgroundImage = `url(${images[i % images.length]})`;
        
        div.addEventListener('pointerenter', () => div.isPaused = true, {passive: true});
        div.addEventListener('pointerleave', () => div.isPaused = false, {passive: true});
        
        container.appendChild(div);
        
        const angle = Math.random() * 6.28;
        const radius = 450 + Math.random() * 600; // Đẩy ảnh ra xa hơn chút

        domObjects.push({
            element: div,
            x: Math.cos(angle) * radius,
            y: ((Math.random() - 0.5) * 1500) | 0,
            z: Math.sin(angle) * radius,
            speed: 0.5 + Math.random() * 0.5,
            isPaused: false
        });
    }
}

// --- RENDERING LOOP ---
let lastTime = 0;
const fpsInterval = 1000 / CONFIG.FPS_LIMIT;

function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);

    const elapsed = timestamp - lastTime;
    if (elapsed < fpsInterval) return; 
    lastTime = timestamp - (elapsed % fpsInterval);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (!isDragging) cameraAngleY += autoRotateSpeed;
    if (Math.abs(cameraAngleY) > 100) cameraAngleY %= 6.28;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const fov = 600;
    
    const cos = Math.cos(cameraAngleY);
    const sin = Math.sin(cameraAngleY);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // --- 1. VẼ CÂY (CÓ HIỆU ỨNG PHUN SƠN/GLOW) ---
    // Bật chế độ cộng màu để tạo hiệu ứng phát sáng
    ctx.globalCompositeOperation = 'lighter'; 
    ctx.fillStyle = '#00ccff'; 
    ctx.beginPath(); 
    for (let i = 0; i < treeData.length; i++) {
        const p = treeData[i];
        const rz = p.x * sin + p.z * cos;
        const scale = fov / (fov + rz + 200);
        
        if (scale > 0) {
            const rx = p.x * cos - p.z * sin;
            const x2d = (rx * scale + cx) | 0;
            const y2d = (p.y * scale + cy) | 0;
            const s = p.size * scale;
            
            // Dùng hình tròn (arc) để hiệu ứng glow mềm mại hơn
            ctx.moveTo(x2d + s, y2d); 
            ctx.arc(x2d, y2d, s, 0, 6.28);
        }
    }
    ctx.fill(); 
    // Tắt chế độ cộng màu ngay lập tức
    ctx.globalCompositeOperation = 'source-over'; 

    // --- 2. VẼ TUYẾT RƠI (Batch Draw - Hình vuông cho nhẹ) ---
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath();
    for (let i = 0; i < snowData.length; i++) {
        const p = snowData[i];
        p.y += p.speed * CONFIG.fallSpeed;
        if (p.y > 1000) p.y = -1000;

        const rz = p.x * sin + p.z * cos;
        const scale = fov / (fov + rz + 200);

        if (scale > 0) {
            const rx = p.x * cos - p.z * sin;
            const x2d = (rx * scale + cx) | 0;
            const y2d = (p.y * scale + cy) | 0;
            const s = p.size * scale;
            if (x2d > 0 && x2d < w && y2d > 0 && y2d < h) {
                ctx.rect(x2d, y2d, s, s);
            }
        }
    }
    ctx.fill();

    // --- 3. VẼ TUYẾT NỀN (Batch Draw - Hình vuông mờ) ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; 
    ctx.beginPath();
    for (let i = 0; i < groundData.length; i++) {
        const p = groundData[i];
        const rz = p.x * sin + p.z * cos;
        const scale = fov / (fov + rz + 200);

        if (scale > 0) {
            const rx = p.x * cos - p.z * sin;
            const x2d = (rx * scale + cx) | 0;
            const y2d = (p.y * scale + cy) | 0;
            const s = p.size * scale;
            if (x2d > -10 && x2d < w + 10 && y2d > 0 && y2d < h) {
                ctx.rect(x2d, y2d, s, s);
            }
        }
    }
    ctx.fill();

    // --- 4. CẬP NHẬT ẢNH DOM ---
    for (let i = 0; i < domObjects.length; i++) {
        const obj = domObjects[i];
        if (!obj.isPaused) {
            obj.y += obj.speed * CONFIG.fallSpeed;
            if (obj.y > 1000) obj.y = -1000;
        }

        const rz = obj.x * sin + obj.z * cos;
        const scale = fov / (fov + rz + 200);

        if (scale > 0) {
            const rx = obj.x * cos - obj.z * sin;
            const x2d = (rx * scale + cx) | 0;
            const y2d = (obj.y * scale + cy) | 0;

            obj.element.style.transform = `translate3d(${x2d}px, ${y2d}px, 0) scale(${scale})`;
            obj.element.style.zIndex = (scale * 100) | 0;
            obj.element.style.opacity = scale > 1.2 ? 1 : scale;
            
            if (obj.element.style.display === 'none') obj.element.style.display = 'block';
        } else {
            if (obj.element.style.display !== 'none') obj.element.style.display = 'none';
        }
    }
}