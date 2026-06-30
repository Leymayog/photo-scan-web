// =========================================
// 🧠 โหลดโมเดล AI สแกนใบหน้า (Face-API) ผ่าน URL ออนไลน์
// =========================================
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
]).then(() => {
  console.log('✅ โหลดโมเดล AI สแกนใบหน้าเสร็จสมบูรณ์');
}).catch(err => {
  console.error('❌ โหลดโมเดล AI ไม่สำเร็จ แต่ระบบไดร์ฟยังทำงานได้ปกติ:', err);
});

// =========================================
// 🗂️ ตัวแปรเก็บข้อมูล
// =========================================
let folders = [];
let folderToDeleteId = null;
let folderToDeleteElement = null;
let currentFolderId = null; 
let currentImagesCount = 0; 
let selectedPhotos = new Set(); 
let stream = null; 

// =========================================
// 🎯 ดึงองค์ประกอบหน้าจอหลัก (ใช้โครงสร้างเสถียรแบบอดีต)
// =========================================
const dashboardView = document.getElementById('dashboard-view');
const galleryView = document.getElementById('gallery-view');
const photoGrid = document.getElementById('photo-grid');
const galleryTitle = document.getElementById('gallery-title');
const btnBack = document.getElementById('btnBack');

const eventNameInput = document.getElementById('eventName');
const createBtn = document.getElementById('createBtn');
const folderContainer = document.getElementById('folder-container');

const downloadBar = document.getElementById('download-bar');
const selectedCountText = document.getElementById('selected-count');
const btnDownloadBatch = document.getElementById('btnDownloadBatch');
const btnCancelSelect = document.getElementById('btnCancelSelect');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxDownload = document.getElementById('lightbox-download');
const btnCloseLightbox = document.getElementById('btnCloseLightbox');

const modal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// 🤖 องค์ประกอบกล้อง AI
const cameraModal = document.getElementById('camera-modal');
const videoPreview = document.getElementById('video-preview');
const btnCapture = document.getElementById('btnCapture');
const captureCanvas = document.getElementById('capture-canvas');

// ⭐️ URL ของ Google Script ล่าสุดของคุณ
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyx02q_MQk93iTVNPKtNhulyCk-2OOAfLWu_oMhsd52Ate71V2Q7QGX2GtQxyolEpgb/exec";

// =========================================
// 📦 ฟังก์ชันสร้างการ์ดโฟลเดอร์
// =========================================
function createFolderCard(folder) {
  const card = document.createElement('div');
  card.className = 'folder-card';
  card.innerHTML = `
    <button class="delete-btn" title="ลบโฟลเดอร์"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
    <div class="folder-icon">📁</div>
    <h3 class="folder-name">${folder.name}</h3>
    <p class="folder-date">สร้างเมื่อ: ${folder.date}</p>
    <button class="btn-open">เปิดโฟลเดอร์</button>
  `;
  card.querySelector('.delete-btn').addEventListener('click', () => {
    folderToDeleteId = folder.id; folderToDeleteElement = card; 
    modalMessage.innerHTML = `ต้องการลบโฟลเดอร์ <br><b>"${folder.name}"</b> หรือไม่?`;
    modal.classList.add('show');
  });
  card.querySelector('.btn-open').addEventListener('click', () => openGallery(folder.id, folder.name));
  return card;
}

// =========================================
// 🔄 ระบบดึงข้อมูลตอนเปิดเว็บ + Real-time
// =========================================
async function loadFoldersFromDrive(isInitialLoad = false) {
  if (isInitialLoad && folderContainer) {
    folderContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6B7280; padding: 40px; font-size: 18px;">⏳ กำลังเชื่อมต่อกับ Google Drive...</div>';
  }
  
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getFolders`);
    const data = await response.json();
    
    if (data.status === "success" && folderContainer) {
      const fetchedFolders = data.folders.sort((a, b) => b.dateCreated - a.dateCreated); 
      let shouldUpdateUI = isInitialLoad || (folders.length !== fetchedFolders.length) || (folders.length > 0 && fetchedFolders.length > 0 && folders[0].id !== fetchedFolders[0].id);
      
      if (shouldUpdateUI) {
        folders = fetchedFolders; 
        folderContainer.innerHTML = ''; 
        if (folders.length === 0) { 
          folderContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6B7280; padding: 40px;">ยังไม่มีโฟลเดอร์งานครับ เริ่มสร้างได้เลย! 👇</div>'; 
          return; 
        }
        folders.forEach(f => folderContainer.appendChild(createFolderCard(f)));
      }
    }
  } catch (error) {
    console.error("โหลดไดร์ฟไม่สำเร็จ:", error);
  }
}

// รันครั้งแรกทันทีที่เปิดหน้าเว็บ
loadFoldersFromDrive(true);

// วนลูปเช็กข้อมูลอัตโนมัติ
setInterval(() => {
  if (dashboardView && dashboardView.style.display !== 'none') {
    loadFoldersFromDrive(false);
  } else if (galleryView && galleryView.style.display !== 'none' && currentFolderId) {
    openGallery(currentFolderId, galleryTitle.innerText, true);
  }
}, 2000); 

// =========================================
// 📸 ระบบแกลลอรี่ & ดูรูป & ดาวน์โหลด
// =========================================
async function openGallery(folderId, folderName, isSilentRefresh = false) {
  if (!isSilentRefresh && photoGrid) {
    dashboardView.style.display = 'none'; 
    galleryView.style.display = 'block';
    galleryTitle.innerText = folderName; 
    currentFolderId = folderId; 
    currentImagesCount = 0;
    photoGrid.innerHTML = '<div class="loading-text">⏳ กำลังดึงรูปภาพ...</div>';
    clearSelection(); 
  }

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getImages&id=${folderId}`);
    const data = await response.json();

    if (data.status === "success" && photoGrid) {
      if (isSilentRefresh && data.images.length === currentImagesCount) return; 
      
      currentImagesCount = data.images.length; 
      photoGrid.innerHTML = ''; 
      
      if (data.images.length === 0) {
        photoGrid.innerHTML = '<div class="loading-text">ยังไม่มีรูปภาพครับ 😅</div>';
        return;
      }

      const sortedImages = data.images.sort((a, b) => b.dateCreated - a.dateCreated);

      sortedImages.forEach(img => {
        const wrapper = document.createElement('div');
        wrapper.className = 'photo-wrapper' + (selectedPhotos.has(img.id) ? ' selected' : '');
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${img.id}`;
        
        wrapper.innerHTML = `
          <img src="${img.url}" loading="lazy">
          <div class="check-circle"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>
        `;

        wrapper.addEventListener('click', (e) => {
          if (selectedPhotos.size > 0 || e.target.closest('.check-circle')) {
            toggleSelectPhoto(wrapper, img.id);
          } else {
            openLightbox(img.url, downloadUrl);
          }
        });

        photoGrid.appendChild(wrapper);
      });
    }
  } catch (error) {}
}

function openLightbox(imgSrc, downloadUrl) {
  if(lightboxImg && lightboxDownload && lightbox) {
    lightboxImg.src = imgSrc;
    lightboxDownload.href = downloadUrl; 
    lightbox.classList.add('show');
  }
}
if(btnCloseLightbox) btnCloseLightbox.addEventListener('click', () => lightbox.classList.remove('show'));

function toggleSelectPhoto(wrapperElement, photoId) {
  if (selectedPhotos.has(photoId)) {
    selectedPhotos.delete(photoId);
    wrapperElement.classList.remove('selected');
  } else {
    selectedPhotos.add(photoId);
    wrapperElement.classList.add('selected');
  }
  updateDownloadBar();
}

function updateDownloadBar() {
  if (selectedPhotos.size > 0 && downloadBar && selectedCountText) {
    selectedCountText.innerText = `เลือกแล้ว ${selectedPhotos.size} รูป`;
    downloadBar.classList.add('show');
  } else if (downloadBar) {
    downloadBar.classList.remove('show');
  }
}

function clearSelection() {
  selectedPhotos.clear();
  updateDownloadBar();
  document.querySelectorAll('.photo-wrapper').forEach(w => w.classList.remove('selected'));
}
if(btnCancelSelect) btnCancelSelect.addEventListener('click', clearSelection);

// ระบบดาวน์โหลดหลายรูป
if(btnDownloadBatch) {
  btnDownloadBatch.addEventListener('click', async () => {
    if (selectedPhotos.size === 0) return;
    const confirmMsg = `กำลังจะดาวน์โหลด ${selectedPhotos.size} รูป\n\n⚠️ หากรูปไม่ครบ โปรดกด "อนุญาต (Allow)" การดาวน์โหลดหลายไฟล์ครับ`;
    if (!confirm(confirmMsg)) return;

    const originalText = btnDownloadBatch.innerText;
    btnDownloadBatch.innerText = "⏳ ทยอยบันทึก...";
    btnDownloadBatch.disabled = true;

    const photosArray = Array.from(selectedPhotos);
    for (let i = 0; i < photosArray.length; i++) {
      const photoId = photosArray[i];
      const link = document.createElement('a');
      link.href = `https://drive.google.com/uc?export=download&id=${photoId}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    btnDownloadBatch.innerText = originalText;
    btnDownloadBatch.disabled = false;
    clearSelection();
  });
}

// =========================================
// 📸 ระบบ AI สแกนใบหน้า
// =========================================

// 1. ฟังก์ชันเปิดกล้อง
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } } 
    });
    if(videoPreview && cameraModal) {
      videoPreview.srcObject = stream;
      cameraModal.style.display = 'flex';
    }
  } catch (err) {
    alert("ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการตั้งค่าสิทธิ์ครับ");
  }
}

// 2. ฟังก์ชันปิดกล้อง
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    if(cameraModal) cameraModal.style.display = 'none';
  }
}

// 3. ฟังก์ชันถ่ายรูป
if(btnCapture) {
  btnCapture.addEventListener('click', () => {
    if(captureCanvas && videoPreview) {
      const context = captureCanvas.getContext('2d');
      captureCanvas.width = videoPreview.videoWidth;
      captureCanvas.height = videoPreview.videoHeight;
      context.drawImage(videoPreview, 0, 0, captureCanvas.width, captureCanvas.height);
      
      const userImageData = captureCanvas.toDataURL('image/jpeg');
      stopCamera();
      
      alert("ถ่ายรูปสำเร็จ! 🤖 กำลังเตรียมสแกนหาใบหน้าของคุณในแกลลอรี่...");
      // ส่วนถัดไปสำหรับเชื่อมระบบประมวลผลใบหน้า
    }
  });
}

// เชื่อมปุ่มสแกนหน้า
const scanFaceBtn = document.getElementById('btnScanFace');
if(scanFaceBtn) scanFaceBtn.addEventListener('click', startCamera);

// =========================================
// ฟังก์ชันจัดการปุ่มและอีเวนต์พื้นฐานทั่วไป
// =========================================
if(btnBack) {
  btnBack.addEventListener('click', () => {
    galleryView.style.display = 'none'; dashboardView.style.display = 'block';
    photoGrid.innerHTML = ''; currentFolderId = null; clearSelection();
  });
}

async function createNewFolder() {
  if(!eventNameInput || !createBtn) return;
  const name = eventNameInput.value.trim();
  if (name === '') { eventNameInput.classList.add('shake'); setTimeout(() => eventNameInput.classList.remove('shake'), 300); return; }
  const originalBtnText = createBtn.innerHTML; createBtn.innerHTML = "⏳ สร้าง..."; createBtn.disabled = true;
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=create&name=${encodeURIComponent(name)}`);
    if ((await response.json()).status === "success") { loadFoldersFromDrive(false); eventNameInput.value = ''; }
  } catch (error) {} finally { createBtn.innerHTML = originalBtnText; createBtn.disabled = false; }
}

if(createBtn) createBtn.addEventListener('click', createNewFolder);
if(eventNameInput) {
  eventNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') createNewFolder(); });
}
if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => modal.classList.remove('show'));

if(confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (folderToDeleteId) {
      confirmDeleteBtn.disabled = true;
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=delete&id=${folderToDeleteId}`);
        if ((await response.json()).status === "success") {
          modal.classList.remove('show'); if(folderToDeleteElement) folderToDeleteElement.classList.add('removing');
          setTimeout(() => loadFoldersFromDrive(false), 400);
        }
      } catch (error) {} finally { confirmDeleteBtn.disabled = false; }
    }
  });
}
