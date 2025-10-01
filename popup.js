class IconGenerator {
    constructor() {
        this.sizes = [128, 48, 32, 16];
        this.generatedIcons = {};
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const resetBtn = document.getElementById('resetBtn');

        // 上传区域点击事件
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processImage(file);
            }
        });

        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });

        // 下载全部按钮
        downloadAllBtn.addEventListener('click', () => {
            this.downloadAll();
        });

        // 重置按钮
        resetBtn.addEventListener('click', () => {
            this.reset();
        });

        // 单个下载按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn')) {
                const size = parseInt(e.target.dataset.size);
                this.downloadSingle(size);
            }
        });

        // 复制代码按钮
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                copyCode();
            });
        }
    }

    async processImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择有效的图片文件');
            return;
        }

        this.showProgress();

        try {
            const img = await this.loadImage(file);
            await this.generateIcons(img);
            this.showPreview();
        } catch (error) {
            console.error('处理图片时出错:', error);
            alert('处理图片时出错，请重试');
            this.hideProgress();
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('图片加载失败'));
            };

            img.src = url;
        });
    }

    async generateIcons(img) {
        this.generatedIcons = {};

        for (let i = 0; i < this.sizes.length; i++) {
            const size = this.sizes[i];
            this.updateProgress((i + 1) / this.sizes.length * 100, `生成 ${size}×${size} 图标...`);

            const canvas = this.createCanvas(size);
            const ctx = canvas.getContext('2d');

            // 清空画布
            ctx.clearRect(0, 0, size, size);

            // 计算缩放比例，保持宽高比
            const scale = Math.min(size / img.width, size / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            // 居中绘制
            const x = (size - scaledWidth) / 2;
            const y = (size - scaledHeight) / 2;

            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // 转换为blob
            const blob = await this.canvasToBlob(canvas);
            const url = URL.createObjectURL(blob);

            this.generatedIcons[size] = {
                blob,
                url
            };

            // 显示预览
            const imgElement = document.getElementById(`icon${size}`);
            imgElement.src = url;

            // 小延迟让UI更新
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    createCanvas(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    }

    canvasToBlob(canvas) {
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    showProgress() {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'none';
    }

    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
    }

    showPreview() {
        this.hideProgress();
        document.getElementById('previewSection').style.display = 'block';
    }

    downloadSingle(size) {
        if (!this.generatedIcons[size]) {
            alert('图标还未生成');
            return;
        }

        const { blob } = this.generatedIcons[size];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon${size}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async downloadAll() {
        if (Object.keys(this.generatedIcons).length === 0) {
            alert('没有可下载的图标');
            return;
        }

        // 创建一个简单的ZIP文件
        try {
            const zip = await this.createZipFile();
            const url = URL.createObjectURL(zip);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'icons.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('打包下载失败:', error);
            alert('打包下载失败，将逐个下载');

            // 降级到逐个下载
            for (const size of this.sizes) {
                if (this.generatedIcons[size]) {
                    await new Promise(resolve => {
                        setTimeout(() => {
                            this.downloadSingle(size);
                            resolve();
                        }, 500);
                    });
                }
            }
        }
    }

    async createZipFile() {
        // 简单的ZIP文件结构实现
        const files = [];
        let centralDirectory = [];
        let offset = 0;

        for (const size of this.sizes) {
            if (this.generatedIcons[size]) {
                const fileName = `icon${size}.png`;
                const fileData = await this.blobToArrayBuffer(this.generatedIcons[size].blob);
                const fileEntry = this.createZipFileEntry(fileName, fileData, offset);

                files.push(fileEntry.localFile);
                centralDirectory.push(fileEntry.centralDir);
                offset += fileEntry.localFile.byteLength;
            }
        }

        // 合并中央目录
        const centralDirData = this.concatenateArrayBuffers(centralDirectory);

        // 创建中央目录结尾记录
        const endOfCentralDir = this.createEndOfCentralDirectory(files.length, centralDirData.byteLength, offset);

        // 合并所有部分
        const allParts = [...files, centralDirData, endOfCentralDir];
        const zipData = this.concatenateArrayBuffers(allParts);

        return new Blob([zipData], { type: 'application/zip' });
    }

    async blobToArrayBuffer(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(blob);
        });
    }

    createZipFileEntry(fileName, fileData, offset) {
        const fileNameBytes = new TextEncoder().encode(fileName);
        const crc32 = this.calculateCRC32(new Uint8Array(fileData));

        // 本地文件头 (30字节 + 文件名长度)
        const localHeader = new ArrayBuffer(30 + fileNameBytes.length);
        const localView = new DataView(localHeader);

        localView.setUint32(0, 0x04034b50, true); // 本地文件头签名
        localView.setUint16(4, 10, true); // 版本
        localView.setUint16(6, 0, true); // 标志位
        localView.setUint16(8, 0, true); // 压缩方法 (存储)
        localView.setUint16(10, 0, true); // 修改时间
        localView.setUint16(12, 0, true); // 修改日期
        localView.setUint32(14, crc32, true); // CRC32
        localView.setUint32(18, fileData.byteLength, true); // 压缩后大小
        localView.setUint32(22, fileData.byteLength, true); // 未压缩大小
        localView.setUint16(26, fileNameBytes.length, true); // 文件名长度
        localView.setUint16(28, 0, true); // 额外字段长度

        // 添加文件名
        new Uint8Array(localHeader, 30).set(fileNameBytes);

        // 创建完整的本地文件条目
        const localFile = new ArrayBuffer(localHeader.byteLength + fileData.byteLength);
        new Uint8Array(localFile).set(new Uint8Array(localHeader));
        new Uint8Array(localFile, localHeader.byteLength).set(new Uint8Array(fileData));

        // 中央目录条目
        const centralDir = this.createCentralDirectoryEntry(fileName, fileData.byteLength, crc32, offset);

        return { localFile, centralDir };
    }

    createCentralDirectoryEntry(fileName, fileSize, crc32, offset) {
        const fileNameBytes = new TextEncoder().encode(fileName);

        // 中央目录文件头 (46字节 + 文件名长度)
        const header = new ArrayBuffer(46 + fileNameBytes.length);
        const view = new DataView(header);

        view.setUint32(0, 0x02014b50, true); // 中央目录签名
        view.setUint16(4, 20, true); // 制作版本
        view.setUint16(6, 10, true); // 需要版本
        view.setUint16(8, 0, true); // 标志位
        view.setUint16(10, 0, true); // 压缩方法
        view.setUint16(12, 0, true); // 修改时间
        view.setUint16(14, 0, true); // 修改日期
        view.setUint32(16, crc32, true); // CRC32
        view.setUint32(20, fileSize, true); // 压缩后大小
        view.setUint32(24, fileSize, true); // 未压缩大小
        view.setUint16(28, fileNameBytes.length, true); // 文件名长度
        view.setUint16(30, 0, true); // 额外字段长度
        view.setUint16(32, 0, true); // 文件注释长度
        view.setUint16(34, 0, true); // 磁盘号
        view.setUint16(36, 0, true); // 内部文件属性
        view.setUint32(38, 0, true); // 外部文件属性
        view.setUint32(42, offset, true); // 本地头偏移量

        // 添加文件名
        new Uint8Array(header, 46).set(fileNameBytes);

        return header;
    }

    createEndOfCentralDirectory(fileCount, centralDirSize, centralDirOffset) {
        const header = new ArrayBuffer(22);
        const view = new DataView(header);

        view.setUint32(0, 0x06054b50, true); // 结尾记录签名
        view.setUint16(4, 0, true); // 磁盘号
        view.setUint16(6, 0, true); // 中央目录开始磁盘号
        view.setUint16(8, fileCount, true); // 本磁盘上的记录数
        view.setUint16(10, fileCount, true); // 中央目录记录总数
        view.setUint32(12, centralDirSize, true); // 中央目录大小
        view.setUint32(16, centralDirOffset, true); // 中央目录偏移量
        view.setUint16(20, 0, true); // 注释长度

        return header;
    }

    concatenateArrayBuffers(buffers) {
        const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const buffer of buffers) {
            result.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }

        return result.buffer;
    }

    calculateCRC32(data) {
        const crcTable = this.getCRC32Table();
        let crc = 0xFFFFFFFF;

        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }

        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    getCRC32Table() {
        if (!this.crc32Table) {
            this.crc32Table = new Array(256);
            for (let i = 0; i < 256; i++) {
                let crc = i;
                for (let j = 0; j < 8; j++) {
                    crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
                }
                this.crc32Table[i] = crc;
            }
        }
        return this.crc32Table;
    }

    reset() {
        // 清理生成的URL
        Object.values(this.generatedIcons).forEach(icon => {
            if (icon.url) {
                URL.revokeObjectURL(icon.url);
            }
        });

        this.generatedIcons = {};
        document.getElementById('fileInput').value = '';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new IconGenerator();
});

// 复制代码功能 - 完全重写版本
function copyCode() {
    console.log('copyCode 函数被调用');

    const codeText = `{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;

    const copyBtn = document.querySelector('.copy-btn');
    if (!copyBtn) {
        console.error('复制按钮未找到');
        alert('复制按钮未找到');
        return;
    }

    console.log('找到复制按钮，开始复制');
    const originalText = copyBtn.innerHTML;

    // 防止重复点击
    if (copyBtn.disabled) {
        console.log('按钮已禁用，防止重复点击');
        return;
    }

    // 显示复制中状态
    copyBtn.disabled = true;
    copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
        复制中...
    `;

    // 尝试复制
    performCopy(codeText, copyBtn, originalText);
}

// 执行复制操作
function performCopy(text, copyBtn, originalText) {
    // 方法1: 现代 Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        console.log('尝试使用 Clipboard API');
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log('Clipboard API 复制成功');
                showCopySuccess(copyBtn, originalText);
            })
            .catch((err) => {
                console.log('Clipboard API 失败:', err);
                // 失败则尝试方法2
                tryLegacyCopy(text, copyBtn, originalText);
            });
    } else {
        console.log('Clipboard API 不可用，使用传统方法');
        // 直接使用传统方法
        tryLegacyCopy(text, copyBtn, originalText);
    }
}

// 传统复制方法
function tryLegacyCopy(text, copyBtn, originalText) {
    console.log('尝试使用 execCommand');

    let success = false;

    try {
        // 创建一个临时的 textarea 元素
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // 设置样式使其不可见但仍可交互
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');

        document.body.appendChild(textArea);

        // 选择文本
        textArea.focus();
        textArea.select();

        // 兼容iOS
        textArea.setSelectionRange(0, text.length);

        // 尝试复制
        success = document.execCommand('copy');

        // 清理
        document.body.removeChild(textArea);

        if (success) {
            console.log('execCommand 复制成功');
            showCopySuccess(copyBtn, originalText);
        } else {
            console.log('execCommand 返回失败');
            throw new Error('execCommand 返回 false');
        }
    } catch (err) {
        console.error('execCommand 复制失败:', err);
        // 最后的降级方案
        showManualCopyHelp(copyBtn, originalText);
    }
}

// 显示复制成功状态
function showCopySuccess(copyBtn, originalText) {
    console.log('显示复制成功状态');

    copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
        已复制
    `;
    copyBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #229954 100%)';

    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
        copyBtn.disabled = false;
        console.log('复制按钮状态已恢复');
    }, 2000);
}

// 显示手动复制帮助
function showManualCopyHelp(copyBtn, originalText) {
    console.log('显示手动复制帮助');

    copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
        请手动复制
    `;
    copyBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    copyBtn.disabled = false;

    // 尝试选中代码文本便于手动复制
    setTimeout(() => {
        try {
            const codeElement = document.querySelector('.manifest-code');
            if (codeElement) {
                const range = document.createRange();
                const selection = window.getSelection();
                selection.removeAllRanges();
                range.selectNodeContents(codeElement);
                selection.addRange(range);
                console.log('代码文本已选中，用户可以手动复制');
            }
        } catch (e) {
            console.error('选择文本失败:', e);
        }
    }, 100);

    // 显示用户友好的提示
    alert('自动复制失败，代码已为您选中，请按 Ctrl+C (或 Cmd+C) 手动复制');

    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
        console.log('按钮状态已恢复');
    }, 3000);
}

// 确保函数在全局作用域中可用
if (typeof window !== 'undefined') {
    window.copyCode = copyCode;
}

// DOM 加载完成后也注册一次
document.addEventListener('DOMContentLoaded', function() {
    window.copyCode = copyCode;
    console.log('DOM加载完成，复制函数已注册:', typeof window.copyCode);

    // 为复制按钮绑定事件监听器
    const copyBtn = document.getElementById('copyBtn') || document.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCode);
        console.log('复制按钮事件已绑定');
    } else {
        console.log('未找到复制按钮');
    }
});

// 确保页面加载后也能绑定事件
window.addEventListener('load', function() {
    // 为复制按钮绑定事件监听器（如果还没绑定的话）
    const copyBtn = document.getElementById('copyBtn') || document.querySelector('.copy-btn');
    if (copyBtn && !copyBtn.dataset.eventBound) {
        copyBtn.addEventListener('click', copyCode);
        copyBtn.dataset.eventBound = 'true';
        console.log('页面加载完成，复制按钮事件已绑定');
    }
});
