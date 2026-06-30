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
// 🎯 ดึงองค์ประกอบหน้าจอ (พร้อมระบบป้องกันโค้ดพัง)
// =========================================
const getEl = (id) => document.getElementById(id) || document.createElement('div');

const dashboardView = getEl('dashboard-view');
const galleryView = getEl('gallery-view');
const photoGrid = getEl('photo-grid');
const galleryTitle = getEl('gallery-title');
const btnBack = getEl('btnBack');

const eventNameInput = getEl('eventName');
const createBtn = getEl('createBtn');
const folderContainer = getEl('folder-container');

const downloadBar = getEl('download-bar');
const selectedCountText = getEl('selected-count');
const btnDownloadBatch = getEl('btnDownloadBatch');
const btnCancelSelect = getEl('btnCancelSelect');
const lightbox = getEl('lightbox');
const lightboxImg = getEl('lightbox-img');
const lightboxDownload = getEl('lightbox-download');
const btnCloseLightbox = getEl('btnCloseLightbox');

const modal = getEl('custom-modal');
const modalMessage = getEl('modal-message');
const confirmDeleteBtn = getEl('confirmDeleteBtn');
const cancelDeleteBtn = getEl('cancelDeleteBtn');

// 🤖 องค์ประกอบสำหรับระบบกล้อง
const cameraModal = getEl('camera-modal');
const videoPreview = getEl('video-preview');
const btnCapture = getEl('btnCapture');
const captureCanvas = getEl('capture-canvas');

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
  
  const deleteBtn = card.querySelector('.delete-btn');
  if(deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      folderToDeleteId = folder.id; 
      folderToDeleteElement = card; 
      modalMessage.innerHTML = `ต้องการลบโฟลเดอร์ <br><b>"${folder.name}"</b> หรือไม่?`;
      modal.classList.add('show');
    });
  }
  
  const openBtn = card.querySelector('.btn-open');
  if(openBtn) {
    openBtn.addEventListener('click', () => openGallery(folder.id, folder.name));
  }
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
    console.error("ดึงข้อมูลโฟลเดอร์ไม่สำเร็จ:", error);
  }
}

// เรียกใช้งานครั้งแรกทันทีเมื่อโหลดสคริปต์
loadFoldersFromDrive(true);

// ตั้งเวลาอัปเดตแบบ Real-time
setInterval(() => {
  if (dashboardView && dashboardView.style.display !== 'none') {
    loadFoldersFromDrive(false);
  } else if (galleryView && galleryView.style.display !== 'none' && currentFolderId) {
    openGallery(currentFolderId, galleryTitle.innerText, true);
  }
}, 3000); // ปรับเป็น 3 วินาทีเพื่อไม่ให้บราวเซอร์ทำงานหนักเกินไป

// =========================================
// 📸 ระบบแกลลอรี่ & ดูรูป & ดาวน์โหลด (Base64 แบบเสถียร)
// =========================================
async function openGallery(folderId, folderName, isSilentRefresh = false) {
  if (!isSilentRefresh && dashboardView && galleryView) {
    dashboardView.style.display = 'none'; 
    galleryView.style.display = 'block';
    if(galleryTitle) galleryTitle.innerText = folderName; 
    currentFolderId = folderId; 
    currentImagesCount = 0;
    if(photoGrid) photoGrid.innerHTML = '<div class="loading-text">⏳ กำลังโหลดรูปภาพ (อาจใช้เวลาสักครู่)...</div>';
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

      sortedImages.forEach((img, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'photo-wrapper' + (selectedPhotos.has(img.id) ? ' selected' : '');
        wrapper.id = `img-wrapper-${index}`; 

        wrapper.innerHTML = `
          <div class="img-loader" id="loader-${img.id}" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:12px; color:#888;">⏳ โหลดรูป...</div>
          <img id="img-${img.id}" loading="lazy" data-id="${img.id}" style="width: 100%; height: 100%; object-fit: cover; display:none;">
          <div class="check-circle"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>
        `;

        photoGrid.appendChild(wrapper);

        // ดึงภาพผ่าน Base64 ป้องกันภาพแตก/ภาพไม่ขึ้นจากปัญหาข้ามโดเมน
        fetch(`${GOOGLE_SCRIPT_URL}?action=download&id=${img.id}`)
          .then(res => res.json())
          .then(imgData => {
            if (imgData.status === "success") {
              const imageElement = document.getElementById(`img-${img.id}`);
              const loaderElement = document.getElementById(`loader-${img.id}`);
              
              const byteCharacters = atob(imgData.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], {type: imgData.mime});
              const objectUrl = URL.createObjectURL(blob);

              if (imageElement) {
                imageElement.src = objectUrl;
                imageElement.style.display = 'block';
                if (loaderElement) loaderElement.remove();

                wrapper.addEventListener('click', (e) => {
                  if (selectedPhotos.size > 0 || e.target.closest('.check-circle')) {
                    toggleSelectPhoto(wrapper, img.id);
                  } else {
                    const downloadUrl = `https://drive.google.com/uc?export=download&id=${img.id}`;
                    openLightbox(objectUrl, downloadUrl);
                  }
                });
              }
            }
          })
          .catch(err => {
            console.error("โหลดรูปย่อยไม่สำเร็จ:", err);
            const loaderElement = document.getElementById(`loader-${img.id}`);
            if (loaderElement) loaderElement.innerText = "❌ รูปโหลดไม่สำเร็จ";
          });
      });
    }
  } catch (error) {
    console.error("ดึงรูปภาพไม่สำเร็จ:", error);
  }
}

function openLightbox(imgSrc, downloadUrl) {
  if (lightboxImg && lightboxDownload && lightbox) {
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
if(btnCancelSelect) btnCancelSelect.addEventListener('click', () => clearSelection());

// ระบบดาวน์โหลดแบบกลุ่ม
if(btnDownloadBatch) {
  btnDownloadBatch.addEventListener('click', async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`กำลังจะดาวน์โหลด ${selectedPhotos.size} รูป\n\n⚠️ โปรดกด "อนุญาต (Allow)" หากบราวเซอร์ถามเรื่องโหลดหลายไฟล์`)) return;

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
// 📸 ระบบ UI แจ้งเตือน และ AI สแกนใบหน้า
// =========================================
function showStatusOverlay(title, description, showSpinner = true) {
  let overlay = document.getElementById('ai-status-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-status-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:"Prompt",sans-serif;padding:20px;';
    overlay.innerHTML = `
      <div style="background:white;padding:35px 25px;border-radius:24px;width:100%;max-width:360px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
        <div id="ai-spinner" style="width:45px;height:45px;border:4px solid #F3F4F6;border-top:4px solid #4F46E5;border-radius:50%;margin:0 auto 20px auto;animation:spin 1s linear infinite;"></div>
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

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    if(videoPreview) videoPreview.srcObject = stream;
    if(cameraModal) cameraModal.style.display = 'flex';
  } catch (err) {
    showStatusOverlay("❌ เปิดกล้องไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องถ่ายภาพในอุปกรณ์ของคุณ", false);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    if(cameraModal) cameraModal.style.display = 'none';
  }
}

if(btnCapture) {
  btnCapture.addEventListener('click', async () => {
    const context = captureCanvas.getContext('2d');
    if(!context || !videoPreview) return;
    
    captureCanvas.width = videoPreview.videoWidth;
    captureCanvas.height = videoPreview.videoHeight;
    context.drawImage(videoPreview, 0, 0, captureCanvas.width, captureCanvas.height);
    
    stopCamera();
    showStatusOverlay("⏳ ถ่ายรูปสำเร็จ!", "กำลังวิเคราะห์และเตรียมสแกนหาใบหน้าของคุณในแกลลอรี่...");

    try {
      const userImgElement = new Image();
      userImgElement.src = captureCanvas.toDataURL('image/jpeg');
      await new Promise(r => userImgElement.onload = r);

      const userDetection = await faceapi.detectSingleFace(userImgElement).withFaceLandmarks().withFaceDescriptor();

      if (!userDetection) {
        showStatusOverlay("❌ ไม่พบใบหน้าของคุณ", "ระบบไม่สามารถตรวจจับโครงหน้าได้ชัดเจน กรุณากดลองใหม่อีกครั้งในที่สว่างๆ ครับ", false);
        return;
      }

      const faceMatcher = new faceapi.FaceMatcher(userDetection.descriptor, 0.5);
      const oldTitle = galleryTitle ? galleryTitle.innerText : "แกลลอรี่";
      if(galleryTitle) galleryTitle.innerText = "⏳ กำลังสแกนหาใบหน้าของคุณ...";

      const allPhotos = document.querySelectorAll('.photo-wrapper');
      let foundCount = 0;
      const totalPhotos = allPhotos.length;

      for (let i = 0; i < totalPhotos; i++) {
        const wrapper = allPhotos[i];
        const imgEl = wrapper.querySelector('img');
        if(!imgEl) continue;
        const driveId = imgEl.getAttribute('data-id'); 

        showStatusOverlay("🤖 ระบบกำลังค้นหาใบหน้า", `กำลังประมวลผลรูปภาพ\n[ กำลังตรวจรูปภาพที่ ${i + 1} จากทั้งหมด ${totalPhotos} รูป ]`);

        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + driveId)}`;
          const aiImgElement = new Image();
          aiImgElement.crossOrigin = 'anonymous';
          aiImgElement.src = proxyUrl;
          await new Promise((resolve, reject) => {
            aiImgElement.onload = resolve;
            aiImgElement.onerror = reject;
          });

          const detections = await faceapi.detectAllFaces(aiImgElement).withFaceLandmarks().withFaceDescriptors();

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
          wrapper.style.display = 'none'; 
        }
      }

      hideStatusOverlay();
      if(galleryTitle) galleryTitle.innerText = `ค้นพบรูปของคุณทั้งหมด ${foundCount} รูป 🎉`;

      const galleryHeader = document.querySelector('.gallery-header');
      if (galleryHeader && !document.getElementById('btnClearScan')) {
        const btnClearScan = document.createElement('button');
        btnClearScan.id = 'btnClearScan';
        btnClearScan.innerText = '↺ แสดงรูปทั้งหมด';
        btnClearScan.style.cssText = 'padding:10px 20px;margin-left:10px;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:12px;font-family:"Prompt";cursor:pointer;font-weight:500;';
        btnClearScan.addEventListener('click', () => {
          allPhotos.forEach(w => w.style.display = 'block');
          if(galleryTitle) galleryTitle.innerText = oldTitle;
          if(document.getElementById('btnClearScan')) galleryHeader.removeChild(btnClearScan);
        });
        galleryHeader.appendChild(btnClearScan);
      }

    } catch (error) {
      console.error("AI Error:", error);
      showStatusOverlay("❌ เกิดข้อผิดพลาด", "ระบบไม่สามารถประมวลผลข้อมูล AI ได้ในขณะนี้", false);
    }
  });
}

// ผูกปุ่มสแกนหน้า
const btnScanFace = document.getElementById('btnScanFace');
if(btnScanFace) btnScanFace.addEventListener('click', startCamera);

// =========================================
// ฟังก์ชันพื้นฐานอื่นๆ
// =========================================
if(btnBack) {
  btnBack.addEventListener('click', () => {
    if(galleryView && dashboardView) {
      galleryView.style.display = 'none'; 
      dashboardView.style.display = 'block';
    }
    if(photoGrid) photoGrid.innerHTML = ''; 
    currentFolderId = null; 
    clearSelection();
  });
}

async function createNewFolder() {
  if(!eventNameInput || !createBtn) return;
  const name = eventNameInput.value.trim();
  if (name === '') { 
    eventNameInput.classList.add('shake'); 
    setTimeout(() => eventNameInput.classList.remove('shake'), 300); 
    return; 
  }
  const originalBtnText = createBtn.innerHTML; 
  createBtn.innerHTML = "⏳ สร้าง..."; 
  createBtn.disabled = true;
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=create&name=${encodeURIComponent(name)}`);
    const resData = await response.json();
    if (resData.status === "success") { 
      loadFoldersFromDrive(false); 
      eventNameInput.value = ''; 
    }
  } catch (error) {
    console.error("สร้างโฟลเดอร์ไม่สำเร็จ:", error);
  } finally { 
    createBtn.innerHTML = originalBtnText; 
    createBtn.disabled = false; 
  }
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
        const resData = await response.json();
        if (resData.status === "success") {
          modal.classList.remove('show'); 
          if(folderToDeleteElement) folderToDeleteElement.classList.add('removing');
          setTimeout(() => loadFoldersFromDrive(false), 400);
        }
      } catch (error) {
        console.error("ลบโฟลเดอร์ไม่สำเร็จ:", error);
      } finally { 
        confirmDeleteBtn.disabled = false; 
      }
    }
  });
}

// เพิ่มสไตล์แอนิเมชันวงกลมหมุนโหลดรูป
const style = document.createElement('style');
style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .shake { animation: shake 0.3s; } @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }';
document.head.appendChild(style);
