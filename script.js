// ==================================================
// --- CẤU HÌNH MOBILE (GIẢM TẢI TỐI ĐA) ---
// ==================================================
const isMobile = window.innerWidth < 768;

const CONFIG = {
    photoCount: 8,        
    snowCount: isMobile ? 150 : 300,  // Mobile giảm một nửa tuyết
    groundCount: isMobile ? 300 : 500, // Mobile giảm nền
    treeSteps: isMobile ? 180 : 250,  // Cây thưa hơn chút trên mobile
    fallSpeed: 1.0,       
    FPS_LIMIT: 30         // Khóa cứng 30 FPS để không nóng máy
};

// --- QUẢN LÝ VIDEO & NHẠC ---
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
// --- 3D ENGINE (OPTIMIZED FOR MOBILE) ---
// ==================================================

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

// Giảm độ phân giải render trên mobile để mượt hơn
const dpr = isMobile ? 1 : (window.devicePixelRatio || 1); 

function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Biến Camera
let cameraAngleY = 0;
let lastTouchX = 0;
let isDragging = false;
let autoRotateSpeed = 0.002; 

// Object Pools (Mảng cố định để tránh tạo rác bộ nhớ)
const treeData = [];
const snowData = [];
const groundData = [];
const domObjects = [];

function initTrue3DWorld() {
    // Reset dữ liệu
    treeData.length = 0;
    snowData.length = 0;
    groundData.length = 0;
    domObjects.length = 0;

    createTree();
    createSnow();
    createGround();
    createPhotos();

    const scene = document.getElementById('layer-3d');
    
    // --- XỬ LÝ CẢM ỨNG (TOUCH EVENTS) ---
    // Sử dụng passive: false để chặn cuộn trang triệt để
    scene.addEventListener('touchstart', e => {
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
    }, {passive: false});

    scene.addEventListener('touchmove', e => {
        if (!isDragging) return;
        e.preventDefault(); // Chặn cuộn trang
        const delta = e.touches[0].clientX - lastTouchX;
        cameraAngleY += delta * 0.008; // Tăng tốc độ xoay một chút
        lastTouchX = e.touches[0].clientX;
    }, {passive: false});

    scene.addEventListener('touchend', () => { isDragging = false; });

    // Mouse cho PC
    scene.addEventListener('mousedown', e => { isDragging = true; lastTouchX = e.clientX; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const delta = e.clientX - lastTouchX;
        cameraAngleY += delta * 0.005;
        lastTouchX = e.clientX;
    });

    requestAnimationFrame(renderLoop);
}

// --- TẠO DỮ LIỆU ---
function createTree() {
    const steps = CONFIG.treeSteps;
    for (let i = 0; i < steps; i++) {
        const p = i / steps;
        // Giảm kích thước bán kính đi chút để vừa màn hình dọc
        const r = (isMobile ? 250 : 320) * Math.pow(1 - p, 0.8);
        const y = 400 - (800 * p);
        const angle = i * 0.2;
        treeData.push({ x: Math.cos(angle)*r, y: y|0, z: Math.sin(angle)*r, size: Math.random()*3+2 });
    }
}

function createSnow() {
    for (let i = 0; i < CONFIG.snowCount; i++) {
        const a = Math.random()*6.28;
        const r = 100 + Math.random()*900;
        snowData.push({ x: Math.cos(a)*r, y:(Math.random()-0.5)*2000, z:Math.sin(a)*r, size:Math.random()*2+1, speed:1+Math.random() });
    }
}

function createGround() {
    for (let i = 0; i < CONFIG.groundCount; i++) {
        const a = Math.random()*6.28;
        const d = Math.pow(Math.random(), 2);
        const r = d * 1100;
        groundData.push({ x: Math.cos(a)*r, y:410+Math.random()*20, z:Math.sin(a)*r, size:(Math.random()*5+3)*(1-d*0.5) });
    }
}

function createPhotos() {
    const container = document.getElementById('dom-objects');
    container.innerHTML = ''; 
    const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg', 'assets/photo4.jpg', 'assets/photo5.jpg', 'assets/photo6.jpg'];
    
    for(let i=0; i < CONFIG.photoCount; i++) {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.style.backgroundImage = `url(${images[i % images.length]})`;
        
        // Fix sự kiện touch trên ảnh
        div.addEventListener('touchstart', (e) => { div.isPaused = true; e.stopPropagation(); }, {passive: true});
        div.addEventListener('touchend', () => div.isPaused = false, {passive: true});
        
        container.appendChild(div);
        const a = Math.random()*6.28;
        const r = 400 + Math.random()*500;
        domObjects.push({ element: div, x: Math.cos(a)*r, y:((Math.random()-0.5)*1500)|0, z:Math.sin(a)*r, speed:0.5+Math.random()*0.5, isPaused: false });
    }
}

// --- RENDER LOOP (OPTIMIZED) ---
let lastTime = 0; 
const fpsInterval = 1000 / CONFIG.FPS_LIMIT;

function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);

    const elapsed = timestamp - lastTime;
    if (elapsed < fpsInterval) return;
    lastTime = timestamp - (elapsed % fpsInterval);

    // Xóa màn hình
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (!isDragging) cameraAngleY += autoRotateSpeed;
    // Reset góc xoay
    if (cameraAngleY > 62.8) cameraAngleY = 0; // 62.8 = 10 vòng

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    // Tự động Zoom Out trên màn hình dọc
    // Nếu màn hình dọc (cao > rộng), tăng FOV hoặc đẩy lùi vật thể
    let fov = 600;
    if (window.innerHeight > window.innerWidth) {
        fov = 500; // Giảm FOV tạo cảm giác cây nhỏ lại, vừa khung hình hơn
    }

    const cos = Math.cos(cameraAngleY);
    const sin = Math.sin(cameraAngleY);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // --- 1. VẼ CÂY (Dùng vòng lặp for i thay vì for of để nhanh hơn) ---
    ctx.globalCompositeOperation = 'lighter'; 
    ctx.fillStyle = '#00ccff'; 
    ctx.beginPath();
    for (let i = 0; i < treeData.length; i++) {
        const p = treeData[i];
        const rz = p.x*sin + p.z*cos; 
        // Thêm +300 vào khoảng cách z để đẩy cây ra xa hơn trên mobile
        const scale = fov / (fov + rz + (isMobile ? 300 : 200)); 
        
        if (scale > 0) {
            const x2d = (p.x*cos - p.z*sin)*scale + cx;
            const y2d = (p.y*scale + cy)|0;
            // Vẽ hình tròn nhỏ thay vì rect để mịn hơn, mobile hiện đại chịu được
            ctx.moveTo(x2d, y2d);
            ctx.arc(x2d, y2d, p.size*scale, 0, 6.28);
        }
    }
    ctx.fill(); 
    ctx.globalCompositeOperation = 'source-over';

    // --- 2. VẼ TUYẾT & NỀN (Gộp chung logic vẽ vuông để tối ưu) ---
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath();
    // Tuyết rơi
    for (let i = 0; i < snowData.length; i++) {
        const p = snowData[i];
        p.y += p.speed * CONFIG.fallSpeed; 
        if(p.y > 1000) p.y = -1000;

        const rz = p.x*sin + p.z*cos; 
        const scale = fov / (fov + rz + 200);

        if (scale > 0) {
            const x2d = (p.x*cos - p.z*sin)*scale + cx;
            const y2d = p.y*scale + cy;
            const s = p.size*scale;
            if (x2d>0 && x2d<w && y2d>0 && y2d<h) ctx.rect(x2d|0, y2d|0, s, s);
        }
    }
    // Tuyết nền
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < groundData.length; i++) {
        const p = groundData[i];
        const rz = p.x*sin + p.z*cos; 
        const scale = fov / (fov + rz + 200);

        if (scale > 0) {
            const x2d = (p.x*cos - p.z*sin)*scale + cx;
            const y2d = p.y*scale + cy;
            const s = p.size*scale;
            if (x2d>-10 && x2d<w+10 && y2d>0 && y2d<h) ctx.rect(x2d|0, y2d|0, s, s);
        }
    }
    ctx.fill();

    // --- 3. CẬP NHẬT ẢNH ---
    for (let i = 0; i < domObjects.length; i++) {
        const obj = domObjects[i];
        if (!obj.isPaused) { 
            obj.y += obj.speed * CONFIG.fallSpeed; 
            if(obj.y > 1000) obj.y = -1000; 
        }
        
        const rz = obj.x*sin + obj.z*cos; 
        const scale = fov / (fov + rz + (isMobile ? 300 : 200));

        if (scale > 0) {
            const x2d = (obj.x*cos - obj.z*sin)*scale + cx;
            const y2d = obj.y*scale + cy;
            
            // Dùng transform translate3d để dùng GPU
            obj.element.style.transform = `translate3d(${x2d|0}px, ${y2d|0}px, 0) scale(${scale})`;
            obj.element.style.zIndex = (scale*100)|0; 
            obj.element.style.opacity = scale > 1.2 ? 1 : scale;
            
            if(obj.element.style.display==='none') obj.element.style.display='block';
        } else {
            if(obj.element.style.display!=='none') obj.element.style.display='none';
        }
    }
}