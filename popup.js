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