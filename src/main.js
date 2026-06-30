// =========================================
// 🧠 โหลดโมเดล AI สแกนใบหน้า (Face-API)
// =========================================
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
]).then(() => {
  console.log('✅ โหลดโมเดล AI สแกนใบหน้าเสร็จสมบูรณ์');
}).catch(err => {
  console.error('❌ โหลดโมเดล AI ไม่สำเร็จ:', err);
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
// 🎯 ดึงองค์ประกอบหน้าจอ
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

// 🤖 องค์ประกอบสำหรับระบบกล้อง
const cameraModal = document.getElementById('camera-modal');
const videoPreview = document.getElementById('video-preview');
const btnCapture = document.getElementById('btnCapture');
const captureCanvas = document.getElementById('capture-canvas');

// ⭐️ URL ของคุณ
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
  if (isInitialLoad) {
    folderContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6B7280; padding: 40px; font-size: 18px;">⏳ กำลังเชื่อมต่อกับ Google Drive...</div>';
  }
  
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getFolders`);
    const data = await response.json();
    
    if (data.status === "success") {
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
  } catch (error) {}
}

loadFoldersFromDrive(true);

setInterval(() => {
  if (dashboardView.style.display !== 'none') {
    loadFoldersFromDrive(false);
  } else if (galleryView.style.display !== 'none' && currentFolderId) {
    openGallery(currentFolderId, galleryTitle.innerText, true);
  }
}, 1500); 

// =========================================
// 📸 ระบบแกลลอรี่ & ดูรูป & ดาวน์โหลด (แก้ไขเพื่อ GitHub Pages)
// =========================================
async function openGallery(folderId, folderName, isSilentRefresh = false) {
  if (!isSilentRefresh) {
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

    if (data.status === "success") {
      if (isSilentRefresh && data.images.length === currentImagesCount) return; 
      
      currentImagesCount = data.images.length; 
      photoGrid.innerHTML = ''; 
      
      if (data.images.length === 0) {
        photoGrid.innerHTML = '<div class="loading-text">ยังไม่มีรูปภาพครับ 😅</div>';
        return;
      }

      const sortedImages = data.images.sort((a, b) => b.dateCreated - a.dateCreated);

      sortedImages.forEach((img, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'photo-wrapper' + (selectedPhotos.has(img.id) ? ' selected' : '');
        wrapper.id = `img-wrapper-${index}`; 

        // ⭐️ จุดสำคัญ: ปรับโครงสร้างลิงก์สำหรับแสดงผล และลิงก์สำหรับดาวน์โหลดแยกกัน
        const displayUrl = `https://drive.google.com/uc?export=view&id=${img.id}`;
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${img.id}`;
        
        wrapper.innerHTML = `
          <img src="${displayUrl}" loading="lazy" data-id="${img.id}" style="width: 100%; height: 100%; object-fit: cover;">
          <div class="check-circle"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>
        `;

        wrapper.addEventListener('click', (e) => {
          if (selectedPhotos.size > 0 || e.target.closest('.check-circle')) {
            toggleSelectPhoto(wrapper, img.id);
          } else {
            openLightbox(displayUrl, downloadUrl);
          }
        });

        photoGrid.appendChild(wrapper);
      });
    }
  } catch (error) {
    console.error("ดึงรูปภาพไม่สำเร็จ:", error);
  }
}

function openLightbox(imgSrc, downloadUrl) {
  lightboxImg.src = imgSrc;
  lightboxDownload.href = downloadUrl; 
  lightbox.classList.add('show');
}
btnCloseLightbox.addEventListener('click', () => lightbox.classList.remove('show'));

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
  if (selectedPhotos.size > 0) {
    selectedCountText.innerText = `เลือกแล้ว ${selectedPhotos.size} รูป`;
    downloadBar.classList.add('show');
  } else {
    downloadBar.classList.remove('show');
  }
}

function clearSelection() {
  selectedPhotos.clear();
  updateDownloadBar();
  document.querySelectorAll('.photo-wrapper').forEach(w => w.classList.remove('selected'));
}
btnCancelSelect.addEventListener('click', clearSelection);

// 🚀 ระบบดาวน์โหลดหลายรูป
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

// =========================================
// 📸 ระบบ UI แจ้งเตือน และ AI สแกนใบหน้า (ดีไซน์ใหม่)
// =========================================

// สร้างหน้าต่างแจ้งเตือน Overlay ขึ้นมาใหม่ที่นี่ ไม่ใช้ alert บราวเซอร์แล้ว
function showStatusOverlay(title, description, showSpinner = true) {
  let overlay = document.getElementById('ai-status-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-status-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:"Prompt",sans-serif;padding:20px;';
    overlay.innerHTML = `
      <div style="background:white;padding:35px 25px;border-radius:24px;width:100%;max-width:360px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
        <div id="ai-spinner" class="ai-spinner" style="width:45px;height:45px;border:4px solid #F3F4F6;border-top:4px solid #4F46E5;border-radius:50%;margin:0 auto 20px auto;animation:spin 1s linear infinite;"></div>
        <h3 id="ai-overlay-title" style="margin:0 0 10px 0;font-size:20px;font-weight:600;color:#1F2937;"></h3>
        <p id="ai-overlay-desc" style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;white-space:pre-line;"></p>
        <button id="ai-overlay-btn" style="display:none;margin-top:20px;width:100%;padding:12px;background:#4F46E5;color:white;border:none;border-radius:12px;font-family:'Prompt';font-weight:500;cursor:pointer;">ตกลง</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('ai-overlay-btn').addEventListener('click', hideStatusOverlay);
  }
  document.getElementById('ai-overlay-title').innerText = title;
  document.getElementById('ai-overlay-desc').innerText = description;
  document.getElementById('ai-spinner').style.display = showSpinner ? 'block' : 'none';
  document.getElementById('ai-overlay-btn').style.display = showSpinner ? 'none' : 'block';
  overlay.style.display = 'flex';
}

function hideStatusOverlay() {
  const overlay = document.getElementById('ai-status-overlay');
  if (overlay) overlay.style.display = 'none';
}

// 1. ฟังก์ชันเปิดกล้อง (แก้ไขอาการกล้องซูมเกินไป โดยระบุแอตทริบิวต์พื้นฐาน)
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    videoPreview.srcObject = stream;
    cameraModal.style.display = 'flex';
  } catch (err) {
    showStatusOverlay("❌ เปิดกล้องไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องถ่ายภาพในอุปกรณ์ของคุณ", false);
  }
}

// 2. ฟังก์ชันปิดกล้อง
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    cameraModal.style.display = 'none';
  }
}

// 3. ฟังก์ชันถ่ายรูปและประมวลผลค้นหาใบหน้า
btnCapture.addEventListener('click', async () => {
  const context = captureCanvas.getContext('2d');
  captureCanvas.width = videoPreview.videoWidth;
  captureCanvas.height = videoPreview.videoHeight;
  context.drawImage(videoPreview, 0, 0, captureCanvas.width, captureCanvas.height);
  
  stopCamera(); // ปิดกล้องทันที

  showStatusOverlay("⏳ ถ่ายรูปสำเร็จ!", "กำลังวิเคราะห์และเตรียมสแกนหาใบหน้าของคุณในแกลลอรี่...");

  try {
    const userImgElement = new Image();
    userImgElement.src = captureCanvas.toDataURL('image/jpeg');
    await new Promise(r => userImgElement.onload = r);

    const userDetection = await faceapi.detectSingleFace(userImgElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!userDetection) {
      showStatusOverlay("❌ ไม่พบใบหน้าของคุณ", "ระบบไม่สามารถตรวจจับโครงหน้าได้ชัดเจน กรุณากดลองใหม่อีกครั้งในที่สว่างๆ ครับ", false);
      return;
    }

    const faceMatcher = new faceapi.FaceMatcher(userDetection.descriptor, 0.5);
    const oldTitle = galleryTitle.innerText;
    galleryTitle.innerText = "⏳ กำลังสแกนหาใบหน้าของคุณ...";

    const allPhotos = document.querySelectorAll('.photo-wrapper');
    let foundCount = 0;
    const totalPhotos = allPhotos.length;

    for (let i = 0; i < totalPhotos; i++) {
      const wrapper = allPhotos[i];
      const imgEl = wrapper.querySelector('img');
      const driveId = imgEl.getAttribute('data-id'); // ดึงไอดีรูปจากกูเกิ้ลไดรฟ์

      showStatusOverlay("🤖 ระบบกำลังค้นหาใบหน้า", `กำลังประมวลผลรูปภาพข้ามโดเมนอย่างปลอดภัย\n[ กำลังตรวจรูปภาพที่ ${i + 1} จากทั้งหมด ${totalPhotos} รูป ]`);

      try {
        // ⚡️ นำไอดีรูปไปโหลดผ่าน Proxy กลาง เพื่อแปลงเป็นภาพที่ AI อ่านพิกเซลได้โดยไม่ติด CORS
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + driveId)}`;
        const aiImgElement = new Image();
        aiImgElement.crossOrigin = 'anonymous';
        aiImgElement.src = proxyUrl;
        await new Promise((resolve, reject) => {
          aiImgElement.onload = resolve;
          aiImgElement.onerror = reject;
        });

        const detections = await faceapi.detectAllFaces(aiImgElement)
          .withFaceLandmarks()
          .withFaceDescriptors();

        let isMatch = false;
        for (let d of detections) {
          const bestMatch = faceMatcher.findBestMatch(d.descriptor);
          if (bestMatch.label !== 'unknown') { 
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          wrapper.style.display = 'block';
          foundCount++;
        } else {
          wrapper.style.display = 'none';
        }
      } catch (loopError) {
        console.error("ข้ามรูปภาพเนื่องจากติดสิทธิ์พิกเซล:", loopError);
        wrapper.style.display = 'none'; 
      }
    }

    hideStatusOverlay();
    galleryTitle.innerText = `ค้นพบรูปของคุณทั้งหมด ${foundCount} รูป 🎉`;

    // ปุ่มแสดงรูปทั้งหมด (Reset)
    const galleryHeader = document.querySelector('.gallery-header');
    if (!document.getElementById('btnClearScan')) {
      const btnClearScan = document.createElement('button');
      btnClearScan.id = 'btnClearScan';
      btnClearScan.innerText = '↺ แสดงรูปทั้งหมด';
      btnClearScan.style.cssText = 'padding:10px 20px;margin-left:10px;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:12px;font-family:"Prompt";cursor:pointer;font-weight:500;';
      btnClearScan.addEventListener('click', () => {
        allPhotos.forEach(w => w.style.display = 'block');
        galleryTitle.innerText = oldTitle;
        if(document.getElementById('btnClearScan')) galleryHeader.removeChild(btnClearScan);
      });
      galleryHeader.appendChild(btnClearScan);
    }

  } catch (error) {
    console.error("AI Main Process Error:", error);
    showStatusOverlay("❌ เกิดข้อผิดพลาด", "ระบบไม่สามารถประมวลผลข้อมูล AI ได้ในขณะนี้", false);
  }
});

// เชื่อมปุ่มสแกนหน้า
document.getElementById('btnScanFace').addEventListener('click', startCamera);

// =========================================
// ฟังก์ชันพื้นฐานอื่นๆ
// =========================================
btnBack.addEventListener('click', () => {
  galleryView.style.display = 'none'; dashboardView.style.display = 'block';
  photoGrid.innerHTML = ''; currentFolderId = null; clearSelection();
});

async function createNewFolder() {
  const name = eventNameInput.value.trim();
  if (name === '') { eventNameInput.classList.add('shake'); setTimeout(() => eventNameInput.classList.remove('shake'), 300); return; }
  const originalBtnText = createBtn.innerHTML; createBtn.innerHTML = "⏳ สร้าง..."; createBtn.disabled = true;
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=create&name=${encodeURIComponent(name)}`);
    if ((await response.json()).status === "success") { loadFoldersFromDrive(false); eventNameInput.value = ''; }
  } catch (error) {} finally { createBtn.innerHTML = originalBtnText; createBtn.disabled = false; }
}
createBtn.addEventListener('click', createNewFolder);
eventNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') createNewFolder(); });
cancelDeleteBtn.addEventListener('click', () => modal.classList.remove('show'));
confirmDeleteBtn.addEventListener('click', async () => {
  if (folderToDeleteId) {
    confirmDeleteBtn.disabled = true;
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=delete&id=${folderToDeleteId}`);
      if ((await response.json()).status === "success") {
        modal.classList.remove('show'); folderToDeleteElement.classList.add('removing');
        setTimeout(() => loadFoldersFromDrive(false), 400);
      }
    } catch (error) {} finally { confirmDeleteBtn.disabled = false; }
  }
});

// เพิ่ม CSS Animation สำหรับ Spinner ตัวโหลดลงใน Head
const style = document.createElement('style');
style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
document.head.appendChild(style);
