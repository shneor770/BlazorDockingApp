window.dockingManager = {
    panels: [],
    panelCounter: 0,
    draggedPanel: null,
    dragStartX: 0,
    dragStartY: 0,
    container: null,
    resizingPanel: null,
    resizeStartX: 0,
    resizeStartY: 0,
    resizeStartWidth: 0,
    resizeStartHeight: 0,
    activeTabId: null,
    tabBar: null,

    init: function (dotNetReference, containerId) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error('Container not found');
            return;
        }

        // Create tab bar
        this.tabBar = document.createElement('div');
        this.tabBar.className = 'tab-bar';
        this.tabBar.id = 'tabBar';
        this.container.appendChild(this.tabBar);

        // Create workspace
        const workspace = document.createElement('div');
        workspace.className = 'dock-workspace';
        this.container.appendChild(workspace);

        // Create initial home panel
        this.createPanel('home', 'טאב הבית', this.getHomeContent(), false);
    },

    updateTabBar: function () {
        if (!this.tabBar) return;

        this.tabBar.innerHTML = '';

        // Add tab count
        const countBadge = document.createElement('span');
        countBadge.className = 'tab-count';
        countBadge.textContent = `${this.panels.length} פתוחים`;
        this.tabBar.appendChild(countBadge);

        // Add tabs
        this.panels.forEach(panel => {
            const tab = document.createElement('div');
            tab.className = 'tab-item';

            if (panel.id === this.activeTabId) {
                tab.classList.add('active');
            }

            if (panel.isFloating) {
                tab.classList.add('floating');
            }


            // Title
            const title = document.createElement('span');
            title.textContent = panel.title;
            title.style.maxWidth = '150px';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
            title.title = panel.title; // Tooltip
            tab.appendChild(title);

            // Close button
            if (panel.closable) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'tab-item-close';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.closePanel(panel.id);
                };
                tab.appendChild(closeBtn);
            }

            // Click to focus
            tab.onclick = () => {
                this.focusPanel(panel.id);
            };

            this.tabBar.appendChild(tab);
        });
    },

    focusPanel: function (panelId) {
        const panelData = this.panels.find(p => p.id === panelId);
        if (!panelData) return;

        this.activeTabId = panelId;
        this.updateTabBar();

        // Scroll to panel or bring floating panel to front
        if (panelData.isFloating) {
            // Bring to front
            this.panels.forEach(p => {
                if (p.isFloating) {
                    p.element.style.zIndex = '1000';
                }
            });
            panelData.element.style.zIndex = '1001';
        } else {
            // Scroll to panel in workspace
            panelData.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Highlight the panel briefly
        const originalBorder = panelData.element.style.border;
        panelData.element.style.border = '2px solid #007acc';
        setTimeout(() => {
            panelData.element.style.border = originalBorder;
        }, 500);
    },

    createPanel: function (type, title, content, closable = true, isFloating = false) {
        const panelId = `panel-${Date.now()}-${Math.random()}`;

        const panel = document.createElement('div');
        panel.id = panelId;
        panel.className = isFloating ? 'dock-panel floating-panel' : 'dock-panel';

        if (isFloating) {
            panel.style.position = 'absolute';
            panel.style.left = `${100 + this.panels.length * 30}px`;
            panel.style.top = `${100 + this.panels.length * 30}px`;
            panel.style.width = '600px';
            panel.style.height = '400px';
            panel.style.zIndex = '1001';
        } else {
            panel.style.flex = '1';
            panel.style.minWidth = '300px';
        }

        const header = document.createElement('div');
        header.className = 'dock-panel-header';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '5px';

        if (isFloating) {
            const dockBtn = document.createElement('button');
            dockBtn.className = 'dock-btn';
            dockBtn.innerHTML = '⇲ עגן';
            dockBtn.title = 'החזר לסרגל';
            dockBtn.onclick = () => this.dockPanel(panelId);
            buttonsDiv.appendChild(dockBtn);
        } else {
            const floatBtn = document.createElement('button');
            floatBtn.className = 'maximize-btn';
            floatBtn.innerHTML = '⇱ צף';
            floatBtn.title = 'הפוך לחלון צף';
            floatBtn.onclick = () => this.floatPanel(panelId);
            buttonsDiv.appendChild(floatBtn);
        }

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.title = 'סגור';
            closeBtn.onclick = () => this.closePanel(panelId);
            buttonsDiv.appendChild(closeBtn);
        }

        header.appendChild(titleSpan);
        header.appendChild(buttonsDiv);

        if (isFloating) {
            header.style.cursor = 'move';
            header.onmousedown = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                this.startDrag(e, panel);
            };
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'dock-panel-content';
        contentDiv.innerHTML = content;

        panel.appendChild(header);
        panel.appendChild(contentDiv);

        // Add click to focus
        panel.onclick = () => this.focusPanel(panelId);

        if (isFloating) {
            this.addResizeHandles(panel);
            this.container.appendChild(panel);
        } else {
            const workspace = this.container.querySelector('.dock-workspace');
            if (workspace.children.length > 0) {
                const resizer = document.createElement('div');
                resizer.className = 'dock-resizer';
                resizer.onmousedown = (e) => this.startResize(e);
                workspace.appendChild(resizer);
            }
            workspace.appendChild(panel);
        }

        this.panels.push({
            id: panelId,
            type: type,
            element: panel,
            isFloating: isFloating,
            title: title,
            content: content,
            closable: closable
        });

        this.activeTabId = panelId;
        this.updateTabBar();

        return panelId;
    },

    addResizeHandles: function (panel) {
        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.right = '0';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.width = '15px';
        resizeHandle.style.height = '15px';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.background = 'linear-gradient(135deg, transparent 50%, #999 50%)';
        resizeHandle.style.zIndex = '10';

        resizeHandle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startPanelResize(e, panel);
        };

        panel.appendChild(resizeHandle);

        const rightEdge = document.createElement('div');
        rightEdge.style.position = 'absolute';
        rightEdge.style.right = '0';
        rightEdge.style.top = '0';
        rightEdge.style.bottom = '15px';
        rightEdge.style.width = '5px';
        rightEdge.style.cursor = 'ew-resize';
        rightEdge.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startPanelResize(e, panel, 'right');
        };
        panel.appendChild(rightEdge);

        const bottomEdge = document.createElement('div');
        bottomEdge.style.position = 'absolute';
        bottomEdge.style.bottom = '0';
        bottomEdge.style.left = '0';
        bottomEdge.style.right = '15px';
        bottomEdge.style.height = '5px';
        bottomEdge.style.cursor = 'ns-resize';
        bottomEdge.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startPanelResize(e, panel, 'bottom');
        };
        panel.appendChild(bottomEdge);
    },

    startPanelResize: function (e, panel, direction = 'both') {
        this.resizingPanel = panel;
        this.resizeDirection = direction;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartWidth = panel.offsetWidth;
        this.resizeStartHeight = panel.offsetHeight;

        document.onmousemove = (e) => this.doPanelResize(e);
        document.onmouseup = () => this.stopPanelResize();
    },

    doPanelResize: function (e) {
        if (!this.resizingPanel) return;

        const diffX = e.clientX - this.resizeStartX;
        const diffY = e.clientY - this.resizeStartY;

        if (this.resizeDirection === 'both' || this.resizeDirection === 'right') {
            const newWidth = Math.max(300, this.resizeStartWidth + diffX);
            this.resizingPanel.style.width = newWidth + 'px';
        }

        if (this.resizeDirection === 'both' || this.resizeDirection === 'bottom') {
            const newHeight = Math.max(200, this.resizeStartHeight + diffY);
            this.resizingPanel.style.height = newHeight + 'px';
        }
    },

    stopPanelResize: function () {
        document.onmousemove = null;
        document.onmouseup = null;
        this.resizingPanel = null;
    },

    startDrag: function (e, panel) {
        this.draggedPanel = panel;
        this.dragStartX = e.clientX - panel.offsetLeft;
        this.dragStartY = e.clientY - panel.offsetTop;

        panel.style.zIndex = '1002';

        document.onmousemove = (e) => this.doDrag(e);
        document.onmouseup = () => this.stopDrag();
    },

    doDrag: function (e) {
        if (!this.draggedPanel) return;

        const newLeft = e.clientX - this.dragStartX;
        const newTop = e.clientY - this.dragStartY;

        const maxLeft = window.innerWidth - this.draggedPanel.offsetWidth;
        const maxTop = window.innerHeight - this.draggedPanel.offsetHeight;

        this.draggedPanel.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        this.draggedPanel.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    },

    stopDrag: function () {
        if (this.draggedPanel) {
            this.draggedPanel.style.zIndex = '1001';
        }
        document.onmousemove = null;
        document.onmouseup = null;
        this.draggedPanel = null;
    },

    startResize: function (e) {
        const resizer = e.target;
        const prevPanel = resizer.previousElementSibling;
        const nextPanel = resizer.nextElementSibling;

        if (!prevPanel || !nextPanel) return;

        const startX = e.clientX;
        const prevWidth = prevPanel.offsetWidth;
        const nextWidth = nextPanel.offsetWidth;

        const doResize = (e) => {
            const diff = e.clientX - startX;
            const newPrevWidth = prevWidth + diff;
            const newNextWidth = nextWidth - diff;

            if (newPrevWidth > 200 && newNextWidth > 200) {
                prevPanel.style.flex = `0 0 ${newPrevWidth}px`;
                nextPanel.style.flex = `0 0 ${newNextWidth}px`;
            }
        };

        const stopResize = () => {
            document.onmousemove = null;
            document.onmouseup = null;
        };

        document.onmousemove = doResize;
        document.onmouseup = stopResize;
    },

    floatPanel: function (panelId) {
        const panelData = this.panels.find(p => p.id === panelId);
        if (!panelData) return;

        const panel = panelData.element;
        const title = panelData.title;
        const content = panel.querySelector('.dock-panel-content').innerHTML;

        this.closePanel(panelId, true);
        this.createPanel(panelData.type, title, content, panelData.closable, true);
    },

    dockPanel: function (panelId) {
        const panelData = this.panels.find(p => p.id === panelId);
        if (!panelData || !panelData.isFloating) return;

        const panel = panelData.element;
        const title = panelData.title;
        const content = panel.querySelector('.dock-panel-content').innerHTML;
        const type = panelData.type;
        const closable = panelData.closable;

        this.closePanel(panelId, true);
        this.createPanel(type, title, content, closable, false);
    },

    closePanel: function (panelId, skipRemoveFromArray = false) {
        const index = this.panels.findIndex(p => p.id === panelId);
        if (index === -1) return;

        const panelData = this.panels[index];
        const panel = panelData.element;

        if (!panelData.isFloating) {
            const resizer = panel.previousElementSibling;
            if (resizer && resizer.classList.contains('dock-resizer')) {
                resizer.remove();
            } else {
                const nextResizer = panel.nextElementSibling;
                if (nextResizer && nextResizer.classList.contains('dock-resizer')) {
                    nextResizer.remove();
                }
            }
        }

        panel.remove();
        this.panels.splice(index, 1);

        if (this.activeTabId === panelId && this.panels.length > 0) {
            this.activeTabId = this.panels[0].id;
        }

        this.updateTabBar();
        //console.log('Panel closed. Remaining:', this.panels.length);
    },

    addPanel: function (type, title) {
        this.panelCounter++;
        const fullTitle = `${title} ${this.panelCounter}`;

        let content;
        if (type === 'list') {
            content = this.getListContent();
        } else if (type === 'form') {
            content = this.getFormContent();
        }

        this.createPanel(type, fullTitle, content, true, false);
        //console.log('Panel added:', fullTitle);
    },

    getHomeContent: function () {
        return `
            <div style="text-align: center; padding: 15px;">
                <h2>Docking Tabs</h2>
                <p style="font-size: 1.2rem; margin-top: 15px;">
                    הוספת טאבים מרובים
                </p>
                <hr style="margin: 15px auto; width: 50%;" />
                <h4>יכולות:</h4>
                <ul style="text-align: right; display: inline-block; margin-top: 20px; list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;"> <strong>סרגל טאבים:</strong> הטאבים הפתוחים מוצגים בסרגל למעלה</li>
                    <li style="margin-bottom: 10px;"> <strong>מעבר בין טאבים:</strong> לחיצה על טאב כדי למקד אותו</li>
                    <li style="margin-bottom: 10px;"> <strong>סגירת טאב:</strong> לחץ על × בטאב</li>
                    <li style="margin-bottom: 10px;"> <strong>טאב צף:</strong> מסומן בכתום בסרגל הטאבים</li>
                    <li style="margin-bottom: 10px;"> <strong>טאב מעוגן:</strong> החזרת טאב למיקום ההתחלתי</li>
                    <li style="margin-bottom: 10px;"> <strong>שינוי גודל:</strong> הקטנה והגדלה מהפינות</li>
                    <li style="margin-bottom: 10px;"> <strong>גודל התוכן:</strong> משתנה בהתאם לגודל הטאב</li>
                    <li style="margin-bottom: 10px;"> <strong>גלילה:</strong> גלילה בתוך כל פאנל</li>
                </ul>
            </div>
        `;
    },

    getListContent: function () {
        const rows = [];
        const statuses = ['פעיל', 'ממתין', 'הושלם', 'בוטל'];
        const statusColors = { 'פעיל': '#4caf50', 'ממתין': '#ff9800', 'הושלם': '#2196f3', 'בוטל': '#f44336' };

        for (let i = 1; i <= 10; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const date = new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString('he-IL');

            rows.push(`
                <tr style="background: ${i % 2 === 0 ? '#f5f5f5' : 'white'};">
                    <td style="padding: 8px; border: 1px solid #ddd; white-space: nowrap;">${i}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">פריט ${i}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; white-space: nowrap;">${date}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                        <span style="padding: 4px 12px; background: ${statusColors[status]}; color: white; border-radius: 12px; font-size: 0.85rem; white-space: nowrap;">
                            ${status}
                        </span>
                    </td>
                </tr>
            `);
        }

        return `
                <div class="container-fluid p-3">
        <h4 class="mb-4">רשימת פריטים</h4>
        <div class="table-responsive">
            <table class="table table-striped table-hover table-bordered">
                <thead class="table-primary">
                    <tr>
                        <th scope="col">מזהה</th>
                        <th scope="col">שם</th>
                        <th scope="col">תאריך</th>
                        <th scope="col">סטטוס</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.join('')}
                </tbody>
            </table>
        </div>
    </div>
        `;
    },

    getFormContent: function () {
        return `
            <div class="container-fluid p-3">
    <h4 class="mb-4">טופס פרטים</h4>
    <form>
        <div class="row g-3">
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">שם פרטי:</label>
                <input type="text" class="form-control" placeholder="הכנס שם פרטי" />
            </div>
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">שם משפחה:</label>
                <input type="text" class="form-control" placeholder="הכנס שם משפחה" />
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12">
                <label class="form-label fw-bold">אימייל:</label>
                <input type="email" class="form-control" placeholder="example@email.com" />
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12">
                <label class="form-label fw-bold">טלפון:</label>
                <input type="tel" class="form-control" placeholder="050-1234567" />
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">תאריך לידה:</label>
                <input type="date" class="form-control" />
            </div>
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">מין:</label>
                <select class="form-select">
                    <option selected>בחר...</option>
                    <option>זכר</option>
                    <option>נקבה</option>
                </select>
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12">
                <label class="form-label fw-bold">כתובת:</label>
                <input type="text" class="form-control" placeholder="רחוב ומספר" />
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">עיר:</label>
                <input type="text" class="form-control" placeholder="עיר" />
            </div>
            <div class="col-12 col-sm-6">
                <label class="form-label fw-bold">מיקוד:</label>
                <input type="text" class="form-control" placeholder="מיקוד" />
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12">
                <label class="form-label fw-bold">הערות:</label>
                <textarea rows="4" class="form-control" placeholder="הערות נוספות..."></textarea>
            </div>
        </div>

        <div class="row g-2 mt-3">
            <div class="col-12 col-sm-auto">
                <button type="button" class="btn btn-primary w-100">שלח</button>
            </div>
            <div class="col-12 col-sm-auto">
                <button type="button" class="btn btn-secondary w-100">איפוס</button>
            </div>
        </div>
    </form>
</div>
        `;
    },

    destroy: function () {
        this.panels = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};