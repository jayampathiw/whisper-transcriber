// Global variables
let selectedFile = null;
let ws = null;
let sessionId = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const audioInput = document.getElementById('audioInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const transcribeBtn = document.getElementById('transcribeBtn');
const checkDepsBtn = document.getElementById('checkDepsBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultContent = document.getElementById('resultContent');
const resultMeta = document.getElementById('resultMeta');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toastContainer = document.getElementById('toastContainer');
const audioInfoDisplay = document.getElementById('audioInfoDisplay');
const segmentsSection = document.getElementById('segmentsSection');
const segmentsList = document.getElementById('segmentsList');
const recentSection = document.getElementById('recentSection');
const recentList = document.getElementById('recentList');

// Initialize WebSocket connection
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showToast('Connection error', 'error');
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(initWebSocket, 3000);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'connected':
            sessionId = data.sessionId;
            break;
        case 'status':
            updateProgress(data.message);
            break;
        case 'audioInfo':
            displayAudioInfo(data.data);
            break;
        case 'complete':
            progressFill.style.width = '100%';
            progressText.textContent = data.message;
            break;
        case 'error':
            showToast(data.message, 'error');
            hideProgress();
            break;
    }
}

// File upload handling
uploadArea.addEventListener('click', () => {
    audioInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

audioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

removeFile.addEventListener('click', () => {
    selectedFile = null;
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    transcribeBtn.disabled = true;
    audioInput.value = '';
});

// Handle file selection
function handleFileSelect(file) {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 
                       'audio/webm', 'audio/ogg', 'audio/flac', 'video/mp4'];
    
    if (!validTypes.some(type => file.type.startsWith(type.split('/')[0]))) {
        showToast('Please select a valid audio file', 'error');
        return;
    }
    
    if (file.size > 500 * 1024 * 1024) {
        showToast('File size must be less than 500MB', 'error');
        return;
    }
    
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
    uploadArea.style.display = 'none';
    transcribeBtn.disabled = false;
}

// Transcribe button handler
transcribeBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showToast('Please select an audio file', 'error');
        return;
    }
    
    transcribeBtn.disabled = true;
    transcribeBtn.querySelector('.btn-text').textContent = 'Processing...';
    transcribeBtn.querySelector('.spinner').style.display = 'inline-block';
    
    showProgress();
    hideResults();
    
    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('model', document.getElementById('modelSelect').value);
    formData.append('language', document.getElementById('languageSelect').value);
    formData.append('task', document.getElementById('taskSelect').value);
    formData.append('timestamps', document.getElementById('timestampsCheck').checked);
    formData.append('wordTimestamps', document.getElementById('wordTimestampsCheck').checked);
    
    try {
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
                'X-Session-Id': sessionId
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayResults(result);
            showToast('Transcription completed successfully!', 'success');
            loadRecentTranscripts();
        } else {
            showToast(result.error || 'Transcription failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        transcribeBtn.disabled = false;
        transcribeBtn.querySelector('.btn-text').textContent = 'Start Transcription';
        transcribeBtn.querySelector('.spinner').style.display = 'none';
        hideProgress();
    }
});

// Check dependencies button
checkDepsBtn.addEventListener('click', async () => {
    checkDepsBtn.disabled = true;
    
    try {
        const response = await fetch('/api/check-dependencies', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('All dependencies are installed!', 'success');
        } else {
            showToast(result.error, 'error');
        }
    } catch (error) {
        showToast('Failed to check dependencies', 'error');
    } finally {
        checkDepsBtn.disabled = false;
    }
});

// Display results
function displayResults(result) {
    resultContent.textContent = result.transcript;
    
    // Display metadata
    const metaItems = [];
    if (result.language) {
        metaItems.push(`Language: ${result.language}`);
    }
    if (result.duration) {
        metaItems.push(`Duration: ${result.duration}`);
    }
    if (result.audioInfo?.sizeFormatted) {
        metaItems.push(`Size: ${result.audioInfo.sizeFormatted}`);
    }
    resultMeta.innerHTML = metaItems.map(item => `<span>${item}</span>`).join('');
    
    // Display segments if available
    if (result.segments && result.segments.length > 0) {
        displaySegments(result.segments);
    }
    
    resultsSection.style.display = 'block';
}

// Display segments with timestamps
function displaySegments(segments) {
    segmentsList.innerHTML = segments.map(segment => `
        <div class="segment-item">
            <div class="segment-time">${formatTime(segment.start)} - ${formatTime(segment.end)}</div>
            <div class="segment-text">${segment.text}</div>
        </div>
    `).join('');
    
    segmentsSection.style.display = 'block';
}

// Display audio info
function displayAudioInfo(info) {
    document.getElementById('audioDuration').textContent = info.duration;
    document.getElementById('audioSize').textContent = info.sizeFormatted;
    document.getElementById('audioCodec').textContent = info.codec;
    audioInfoDisplay.style.display = 'flex';
}

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
    const text = resultContent.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        showToast('Failed to copy', 'error');
    }
});

// Download as text file
downloadBtn.addEventListener('click', () => {
    const text = resultContent.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started!', 'success');
});

// Load recent transcripts
async function loadRecentTranscripts() {
    try {
        const response = await fetch('/api/transcripts');
        const result = await response.json();
        
        if (result.success && result.transcripts.length > 0) {
            displayRecentTranscripts(result.transcripts);
        }
    } catch (error) {
        console.error('Failed to load recent transcripts:', error);
    }
}

// Display recent transcripts
function displayRecentTranscripts(transcripts) {
    recentList.innerHTML = transcripts.slice(0, 5).map(transcript => `
        <div class="recent-item" data-file="${transcript.filename}">
            <div class="recent-item-header">
                <span class="recent-item-name">${transcript.filename}</span>
                <span class="recent-item-time">${formatDate(transcript.timestamp)}</span>
            </div>
            <div class="recent-item-preview">${transcript.text}</div>
        </div>
    `).join('');
    
    recentSection.style.display = 'block';
}

// Progress helpers
function showProgress() {
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Initializing...';
    audioInfoDisplay.style.display = 'none';
}

function hideProgress() {
    setTimeout(() => {
        progressSection.style.display = 'none';
    }, 1000);
}

function updateProgress(message, percentage = null) {
    progressText.textContent = message;
    if (percentage !== null) {
        progressFill.style.width = `${percentage}%`;
    } else {
        // Indeterminate progress
        progressFill.style.width = '70%';
    }
}

// Results helpers
function hideResults() {
    resultsSection.style.display = 'none';
    segmentsSection.style.display = 'none';
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Utility functions
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
}

// Animation for slideOut
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    loadRecentTranscripts();
});