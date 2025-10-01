class IconGenerator {
    constructor() {
        this.sizes = [128, 48, 32, 16];
        this.generatedIcons = {};
        this.config = null;
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.bindEvents();
    }

    // 加载配置文件
    async loadConfig() {
        try {
            const response = await fetch('./config.json');
            this.config = await response.json();
            console.log('配置加载成功:', this.config);
        } catch (error) {
            console.error('配置加载失败:', error);
            // 使用默认配置
            this.config = {
                developer: {
                    name: "开发者",
                    avatar: "👨‍💻",
                    cardTitle: "喜欢这个工具吗？",
                    cardDescription: "关注开发者获取更多实用插件"
                },
                wechat: {
                    id: "your_wechat_id",
                    tip: "扫描上方二维码或搜索微信号添加",
                    benefits: [
                        "🔥 最新实用插件推送",
                        "💬 技术交流和问题解答",
                        "🎆 新工具内测机会",
                        "💼 定制开发服务"
                    ]
                },
                tools: [
                    {
                        icon: "🎨",
                        name: "颜色选择器",
                        description: "一键获取网页中任意颜色值",
                        status: "coming-soon",
                        installText: "即将上线"
                    }
                ],
                contact: {
                    toolSuggestionText: "💬 有工具建议？ 添加微信告诉我们！"
                }
            };
        }
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

        // 开发者卡片功能
        this.bindDeveloperCardEvents();
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

    // 开发者卡片事件绑定
    bindDeveloperCardEvents() {
        // 微信按钮
        const wechatBtn = document.getElementById('wechatBtn');
        if (wechatBtn) {
            wechatBtn.addEventListener('click', () => {
                this.showWeChatInfo();
            });
        }

        // 更多工具按钮
        const moreToolsBtn = document.getElementById('moreToolsBtn');
        if (moreToolsBtn) {
            moreToolsBtn.addEventListener('click', () => {
                this.showMoreTools();
            });
        }
    }

    // 创建统一的弹窗基础结构
    createModalBase(title, content, className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close-btn">×</button>
                    </div>
                    <div class="modal-content">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    // 添加统一的弹窗样式
    addModalStyles() {
        if (document.getElementById('unified-modal-styles')) {
            return; // 样式已存在
        }

        const style = document.createElement('style');
        style.id = 'unified-modal-styles';
        style.textContent = `
            /* 统一弹窗基础样式 */
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .modal-card {
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 400px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 20px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
            }

            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #2c3e50;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .modal-close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-weight: 300;
            }

            .modal-close-btn:hover {
                background: rgba(108, 117, 125, 0.1);
                color: #495057;
                transform: scale(1.1);
            }

            .modal-content {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .modal-section {
                margin-bottom: 24px;
            }

            .modal-section:last-child {
                margin-bottom: 0;
            }

            .modal-info-card {
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                border: 1px solid rgba(255, 107, 107, 0.15);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                margin-bottom: 20px;
            }

            .modal-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .modal-list-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 107, 107, 0.04);
                border: 1px solid rgba(255, 107, 107, 0.1);
                border-radius: 8px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .modal-list-item:hover {
                background: rgba(255, 107, 107, 0.08);
                border-color: rgba(255, 107, 107, 0.2);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(255, 107, 107, 0.1);
            }

            .modal-item-icon {
                font-size: 24px;
                width: 40px;
                text-align: center;
                flex-shrink: 0;
            }

            .modal-item-info {
                flex: 1;
                text-align: left;
            }

            .modal-item-title {
                margin: 0 0 4px;
                font-size: 14px;
                font-weight: 600;
                color: #2c3e50;
            }

            .modal-item-desc {
                margin: 0;
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
            }

            .modal-btn {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                white-space: nowrap;
                flex-shrink: 0;
            }

            .modal-btn:hover {
                background: linear-gradient(135deg, #ee5a52 0%, #dc4c64 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            }

            .modal-btn.secondary {
                background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            }

            .modal-btn.secondary:hover {
                background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
                box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
            }

            .modal-highlight {
                background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(238, 90, 82, 0.05) 100%);
                border: 1px solid rgba(255, 107, 107, 0.15);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .modal-highlight p {
                margin: 0;
                font-size: 13px;
                color: #495057;
                font-weight: 500;
            }

            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes modalSlideUp {
                from {
                    transform: translateY(30px) scale(0.95);
                    opacity: 0;
                }
                to {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }

            .wechat-modal .modal-card {
                max-width: 360px;
            }

            .tools-modal .modal-card {
                max-width: 420px;
            }
        `;

        document.head.appendChild(style);
    }

    // 显示微信信息
    showWeChatInfo() {
        this.addModalStyles();

        // 根据配置决定显示二维码还是手机图标
        const qrCodeContent = this.config.wechat.qrCode ?
            `<img src="${this.config.wechat.qrCode}" alt="微信二维码" style="width: 120px; height: 120px; border-radius: 8px; margin-bottom: 12px; border: 2px solid #f1f3f4;">` :
            `<div style="font-size: 48px; margin-bottom: 12px;">📱</div>`;

        const content = `
            <div class="modal-section">
                <div class="modal-info-card">
                    ${qrCodeContent}
                    <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #2c3e50;">
                        微信号：<strong>${this.config.wechat.id}</strong>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">
                        ${this.config.wechat.tip}
                    </p>
                </div>
            </div>
            <div class="modal-section">
                <h4 style="margin: 0 0 12px; font-size: 16px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
                    🎁 添加微信获得：
                </h4>
                <div class="modal-list">
                    ${this.config.wechat.benefits.map(benefit => `
                        <div style="padding: 8px 0; font-size: 13px; color: #495057;">
                            ${benefit}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const modal = this.createModalBase('💬 添加开发者微信', content, 'wechat-modal');
        this.bindModalEvents(modal);
        document.body.appendChild(modal);
    }

    // 显示更多工具 - 支持已发布状态
    showMoreTools() {
        this.addModalStyles();

        const content = `
            <div class="modal-section">
                <div class="modal-list">
                    ${this.config.tools.map((tool, index) => `
                        <div class="modal-list-item">
                            <div class="modal-item-icon">${tool.icon}</div>
                            <div class="modal-item-info">
                                <h4 class="modal-item-title">${tool.name}</h4>
                                <p class="modal-item-desc">${tool.description}</p>
                            </div>
                            <button class="modal-btn ${tool.status === 'coming-soon' ? 'secondary' : ''}"
                                    data-tool-index="${index}"
                                    ${tool.status === 'coming-soon' ? 'disabled' : ''}>
                                ${tool.installText}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-section">
                <div class="modal-highlight">
                    <p>${this.config.contact.toolSuggestionText}</p>
                </div>
            </div>
        `;

        const modal = this.createModalBase('🔧 更多实用工具', content, 'tools-modal');
        this.bindModalEvents(modal);
        this.bindToolButtonEvents(modal);
        document.body.appendChild(modal);
    }

    // 绑定工具按钮事件
    bindToolButtonEvents(modal) {
        const toolButtons = modal.querySelectorAll('.modal-btn[data-tool-index]');
        toolButtons.forEach(button => {
            const toolIndex = parseInt(button.dataset.toolIndex);
            const tool = this.config.tools[toolIndex];

            if (tool.url && tool.status !== 'coming-soon') {
                button.addEventListener('click', () => {
                    window.open(tool.url, '_blank');
                });
                button.style.cursor = 'pointer';
            }
        });
    }

    // 绑定弹窗事件
    bindModalEvents(modal) {
        const overlay = modal.querySelector('.modal-overlay');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const card = modal.querySelector('.modal-card');

        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        card.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        closeBtn.addEventListener('click', closeModal);
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
