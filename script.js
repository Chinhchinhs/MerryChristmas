// ==================================================
// --- CẤU HÌNH CÂN BẰNG ---
// ==================================================
const CONFIG = {
    photoCount: 15,
    snowCount: 350,       // Tuyết rơi
    groundCount: 300,     // Tuyết nền
    treeSteps: 240,       // Mật độ cây
    fallSpeed: 0.8,       
    FPS_LIMIT: 30,        // Giữ 30 FPS cho mát máy
    RENDER_SCALE: 1.0     // Độ nét cao
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
    
    if(!document.getElementById('overlay-dim')) {
        const dim = document.createElement('div');
        dim.id = 'overlay-dim';
        layer3D.appendChild(dim);
        dim.addEventListener('click', closeFocusedPhoto);
    }
    
    initTrue3DWorld();
});

// ==================================================
// --- 3D ENGINE ---
// ==================================================

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 
let loopId = null; 

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- STATE ---
const State = {
    cameraAngleY: 0,
    cameraZ: 200,
    autoRotate: true,
    isInteracting: false,
    lastX: 0,
    pinchDist: 0,
    focusedPhoto: null
};

// --- DATA ---
const treeData = [];
const snowData = [];
const groundData = [];
const domObjects = [];

function initTrue3DWorld() {
    if (loopId) cancelAnimationFrame(loopId);
    
    treeData.length = 0; snowData.length = 0; groundData.length = 0;
    // Xóa sạch container ảnh cũ
    const container = document.getElementById('dom-objects');
    container.innerHTML = '';
    domObjects.length = 0;

    createTree(); createSnow(); createGround(); createPhotos();

    lastTime = performance.now();
    renderLoop(lastTime);
}

// --- TOUCH HANDLER ---
const scene = document.getElementById('layer-3d');

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

scene.addEventListener('touchstart', e => {
    if (State.focusedPhoto) return;
    if (e.touches.length === 1) {
        State.isInteracting = true;
        State.lastX = e.touches[0].clientX;
        State.autoRotate = false;
    } else if (e.touches.length === 2) {
        State.isInteracting = true;
        State.pinchDist = getDistance(e.touches);
        State.autoRotate = false;
    }
}, {passive: false});

scene.addEventListener('touchmove', e => {
    if (e.cancelable) e.preventDefault(); 
    if (State.focusedPhoto) return;

    if (e.touches.length === 1 && State.isInteracting) {
        const delta = e.touches[0].clientX - State.lastX;
        State.cameraAngleY += delta * 0.006;
        State.lastX = e.touches[0].clientX;
    } else if (e.touches.length === 2 && State.isInteracting) {
        const currentDist = getDistance(e.touches);
        const diff = currentDist - State.pinchDist;
        State.cameraZ -= diff * 2.0; 
        State.cameraZ = Math.max(-600, Math.min(1200, State.cameraZ));
        State.pinchDist = currentDist;
    }
}, {passive: false});

scene.addEventListener('touchend', () => { State.isInteracting = false; });

scene.addEventListener('mousedown', e => { 
    if(State.focusedPhoto) return;
    State.isInteracting = true; State.lastX = e.clientX; State.autoRotate = false; 
});
window.addEventListener('mouseup', () => { State.isInteracting = false; });
window.addEventListener('mousemove', e => {
    if (!State.isInteracting || State.focusedPhoto) return;
    const delta = e.clientX - State.lastX;
    State.cameraAngleY += delta * 0.005;
    State.lastX = e.clientX;
});
scene.addEventListener('wheel', e => {
    if (State.focusedPhoto) return;
    State.cameraZ += e.deltaY * 0.5;
    State.cameraZ = Math.max(-600, Math.min(1200, State.cameraZ));
}, {passive: true});

// --- PHOTO INTERACTION ---
function attachPhotoEvents(div, objData) {
    div.addEventListener('click', (e) => {
        e.stopPropagation();
        if (State.focusedPhoto === objData) closeFocusedPhoto();
        else openFocusedPhoto(div, objData);
    });
    div.addEventListener('touchstart', () => objData.isPaused = true, {passive: true});
    div.addEventListener('touchend', () => {
        if (State.focusedPhoto !== objData) objData.isPaused = false;
    }, {passive: true});
}

function openFocusedPhoto(div, objData) {
    if (State.focusedPhoto) closeFocusedPhoto();
    State.focusedPhoto = objData;
    objData.isPaused = true;
    div.classList.add('focused');
    document.getElementById('overlay-dim').classList.add('active');
    div.style.left = '50%'; div.style.top = '50%';
    div.style.transform = 'translate(-50%, -50%) scale(1)';
}

function closeFocusedPhoto() {
    if (!State.focusedPhoto) return;
    const obj = State.focusedPhoto; const div = obj.element;
    div.classList.remove('focused');
    document.getElementById('overlay-dim').classList.remove('active');
    div.style.left = ''; div.style.top = '';
    obj.isPaused = false; State.focusedPhoto = null;
}

// --- DATA CREATION ---
function createTree() {
    for (let i = 0; i < CONFIG.treeSteps; i++) {
        const p = i / CONFIG.treeSteps;
        const r = 350 * Math.pow(1 - p, 0.8);
        const y = 450 - (900 * p);
        const angle = i * 0.2;
        treeData.push(Math.cos(angle)*r, y|0, Math.sin(angle)*r, Math.random()*3.5+2.5);
    }
}
function createSnow() {
    for (let i = 0; i < CONFIG.snowCount; i++) {
        const a = Math.random()*6.28, r = 100+Math.random()*900;
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
    const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg', 'assets/photo4.jpg', 'assets/photo5.jpg', 'assets/photo6.jpg',
                    'assets/photo7.jpg', 'assets/photo8.jpg', 'assets/photo9.jpg', 'assets/photo10.jpg'
    ];
    for(let i=0; i < CONFIG.photoCount; i++) {
        const div = document.createElement('div'); div.className = 'photo-item';
        div.style.backgroundImage = `url(${images[i % images.length]})`;
        container.appendChild(div);
        
        // Tạo góc ngẫu nhiên
        const a = Math.random()*6.28; 
        const r = 500+Math.random()*600;
        
        const objData = { 
            element: div, 
            x: Math.cos(a)*r, 
            y: ((Math.random()-0.5)*1500)|0, 
            z: Math.sin(a)*r, 
            speed: 0.5+Math.random()*0.5, 
            isPaused: false 
        };
        
        domObjects.push(objData);
        attachPhotoEvents(div, objData);
    }
}

// ==================================================
// --- RENDER LOOP ---
// ==================================================
let lastTime = 0;
const fpsInterval = 1000 / CONFIG.FPS_LIMIT;
let frameCount = 0;
const fov = 600;

function renderLoop(timestamp) {
    loopId = requestAnimationFrame(renderLoop);
    
    const elapsed = timestamp - lastTime;
    if (elapsed < fpsInterval) return;
    lastTime = timestamp - (elapsed % fpsInterval);
    
    frameCount++;

    if (State.autoRotate && !State.isInteracting && !State.focusedPhoto) {
        State.cameraAngleY += 0.002;
    }
    if (Math.abs(State.cameraAngleY) > 100) State.cameraAngleY %= 6.28;

    const w = window.innerWidth; const h = window.innerHeight;
    const cx = w / 2; const cy = h / 2;
    const cos = Math.cos(State.cameraAngleY); const sin = Math.sin(State.cameraAngleY);

    // 1. Xóa màn hình
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // 2. BẬT GLOW (Cây + Tuyết rơi)
    ctx.globalCompositeOperation = 'lighter';

    // Vẽ Cây
    ctx.fillStyle = '#00eaff'; ctx.beginPath();
    for (let i = 0; i < treeData.length; i+=4) {
        const x=treeData[i], y=treeData[i+1], z=treeData[i+2], s=treeData[i+3];
        const rz = x*sin + z*cos;
        const scale = fov / (fov + rz + State.cameraZ);
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx;
            const y2d = y*scale + cy;
            if(x2d>0 && x2d<w) {
                ctx.moveTo(x2d, y2d);
                ctx.arc(x2d, y2d, s*scale, 0, 6.28);
            }
        }
    }
    ctx.fill();

    // Vẽ Tuyết rơi
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let i = 0; i < snowData.length; i+=5) {
        let y = snowData[i+1]; y += snowData[i+4] * CONFIG.fallSpeed;
        if (y > 1000) y = -1000; snowData[i+1] = y;

        const x=snowData[i], z=snowData[i+2], s=snowData[i+3];
        const rz = x*sin + z*cos;
        const scale = fov / (fov + rz + State.cameraZ);
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx;
            const y2d = y*scale + cy;
            if(x2d>0 && x2d<w && y2d>0 && y2d<h) {
                ctx.moveTo(x2d, y2d);
                ctx.arc(x2d, y2d, s*scale, 0, 6.28);
            }
        }
    }
    ctx.fill();

    // 3. TẮT GLOW (Nền đất)
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; 
    ctx.beginPath();
    for (let i = 0; i < groundData.length; i+=4) {
        const x=groundData[i], y=groundData[i+1], z=groundData[i+2], s=groundData[i+3];
        const rz = x*sin + z*cos;
        const scale = fov / (fov + rz + State.cameraZ);
        if (scale > 0) {
            const x2d = (x*cos - z*sin)*scale + cx;
            const y2d = y*scale + cy;
            if(x2d>-50 && x2d<w+50 && y2d>0 && y2d<h) ctx.rect(x2d|0, y2d|0, s*scale, s*scale);
        }
    }
    ctx.fill();

    // 4. CẬP NHẬT ẢNH (ĐÃ SỬA LỖI BIẾN obj.z)
    if (frameCount % 2 !== 0) {
        for (let obj of domObjects) {
            if (obj === State.focusedPhoto) continue;

            if (!obj.isPaused) {
                obj.y += obj.speed * CONFIG.fallSpeed;
                if (obj.y > 1000) obj.y = -1000;
            }

            const rz = obj.x*sin + obj.z*cos; // Đã sửa z -> obj.z
            const scale = fov / (fov + rz + State.cameraZ);

            if (scale > 0) {
                const x2d = (obj.x*cos - obj.z*sin)*scale + cx; // Đã sửa z -> obj.z
                const y2d = obj.y*scale + cy;
                
                obj.element.style.transform = `translate3d(${x2d|0}px, ${y2d|0}px, 0) scale(${scale.toFixed(2)})`;
                obj.element.style.zIndex = (scale*100)|0;
                obj.element.style.opacity = scale > 1.2 ? 1 : scale;
                if (obj.element.style.display === 'none') obj.element.style.display = 'block';
            } else {
                if (obj.element.style.display !== 'none') obj.element.style.display = 'none';
            }
        }
    }
}