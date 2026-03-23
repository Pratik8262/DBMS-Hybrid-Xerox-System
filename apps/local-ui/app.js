const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const uploadBtn = document.getElementById('uploadBtn');
const statusBadge = document.getElementById('statusBadge');

let selectedFiles = [];

// Parse cookie function
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Event Listeners for Drag and Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFilesSelect);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    addFiles(files);
}

function handleFilesSelect(e) {
    const files = e.target.files;
    addFiles(files);
}

function addFiles(files) {
    for (let i = 0; i < files.length; i++) {
        // Prevent huge files explicitly although backend handles limits
        if (files[i].size > 50 * 1024 * 1024) {
            alert(`File ${files[i].name} is too large. Max 50MB.`);
            continue;
        }
        selectedFiles.push({ id: Math.random().toString(36).substr(2, 9), file: files[i] });
    }
    renderFiles();
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(item => item.id !== id);
    renderFiles();
}

function renderFiles() {
    filesList.innerHTML = '';
    
    selectedFiles.forEach(item => {
        const sizeMB = (item.file.size / (1024 * 1024)).toFixed(2);
        
        const el = document.createElement('div');
        el.className = 'file-item';
        el.innerHTML = `
            <div class="file-info">
                <span class="file-name" title="${item.file.name}">${item.file.name}</span>
                <span class="file-size">${sizeMB} MB</span>
            </div>
            <button class="remove-btn" onclick="removeFile('${item.id}')">✕</button>
        `;
        filesList.appendChild(el);
    });

    uploadBtn.disabled = selectedFiles.length === 0;
}

uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const sessionId = getCookie('sessionId');
    if (!sessionId) {
        alert("Session expired or invalid. Please scan the QR code again.");
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerText = 'Uploading...';
    statusBadge.innerText = 'Syncing...';
    statusBadge.style.color = '#F59E0B'; // Amber warning

    try {
        const formData = new FormData();
        selectedFiles.forEach(item => {
            formData.append('files', item.file);
        });
        
        // Pass session ID to associate files
        formData.append('sessionId', sessionId);
        
        // In this local app, hitting relative /api/files/upload hits the serving express backend
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            alert('Files successfully queued for print!');
            selectedFiles = [];
            renderFiles();
            statusBadge.innerText = 'Done';
            statusBadge.style.color = 'var(--success)';
            uploadBtn.innerText = 'Upload & Queue';
        } else {
            throw new Error(result.message || 'Upload failed');
        }

    } catch (error) {
        console.error('Upload Error:', error);
        alert(`Failed to upload: ${error.message}`);
        uploadBtn.disabled = false;
        uploadBtn.innerText = 'Retry Upload';
        statusBadge.innerText = 'Error';
        statusBadge.style.color = '#EF4444'; // Red
    }
});
