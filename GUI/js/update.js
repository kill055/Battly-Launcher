
class ClientUpdateManager {
    constructor() {
        this.updatePopupVisible = false;
        this.init();
    }

    init() {
        window.electronAPI.onUpdatePopup((updateInfo) => {
            this.showUpdatePopup(updateInfo);
        });

        this.checkForUpdatesOnDemand();
    }

    showUpdatePopup(updateInfo) {
        if (this.updatePopupVisible) return;

        this.updatePopupVisible = true;
        
        const popupHTML = `
            <div id="update-popup-overlay">
                <div class="update-popup-container update-popup-pulse">
                    <div class="update-popup-header">
                        <div class="update-popup-icon">
                            <i class="fas fa-download"></i>
                        </div>
                        <h2 class="update-popup-title">
                            NEW UPDATE AVAILABLE
                        </h2>
                    </div>

                    <div class="update-popup-versions">
                        <div class="version-row">
                            <span class="version-label">Current Version:</span>
                            <span class="version-current">${updateInfo.currentVersion}</span>
                        </div>
                        <div class="version-row">
                            <span class="version-label">New Version:</span>
                            <span class="version-new">${updateInfo.newVersion}</span>
                        </div>
                    </div>

                    <div class="update-popup-message">
                        A new version of Hytale F2P Launcher is available.<br>
                        Please download the latest version to continue using the launcher.
                    </div>

                    <button id="update-download-btn" class="update-download-btn">
                        <i class="fas fa-external-link-alt" style="margin-right: 0.5rem;"></i>
                        Download Update
                    </button>

                    <div class="update-popup-footer">
                        This popup cannot be closed until you update the launcher
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);

        this.blockInterface();

        const downloadBtn = document.getElementById('update-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>Opening GitHub...';
                
                try {
                    await window.electronAPI.openDownloadPage();
                    console.log('✅ Download page opened, launcher will close...');
                    
                    downloadBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 0.5rem;"></i>Launcher closing...';
                    
                } catch (error) {
                    console.error('❌ Error opening download page:', error);
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = '<i class="fas fa-external-link-alt" style="margin-right: 0.5rem;"></i>Download Update';
                }
            });
        }

        const overlay = document.getElementById('update-popup-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        }

        console.log('🔔 Update popup displayed with new style');
    }

    blockInterface() {
        const mainContent = document.querySelector('.flex.w-full.h-screen');
        if (mainContent) {
            mainContent.classList.add('interface-blocked');
        }

        document.body.classList.add('no-select');

        document.addEventListener('keydown', this.blockKeyEvents.bind(this), true);
        
        document.addEventListener('contextmenu', this.blockContextMenu.bind(this), true);
        
        console.log('🚫 Interface blocked for update');
    }

    blockKeyEvents(event) {
        if (event.target.closest('#update-popup-overlay')) {
            if ((event.key === 'Enter' || event.key === ' ') && 
                event.target.id === 'update-download-btn') {
                return;
            }
            if (event.key !== 'Tab') {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    }

    blockContextMenu(event) {
        if (!event.target.closest('#update-popup-overlay')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    }

    async checkForUpdatesOnDemand() {
        try {
            const updateInfo = await window.electronAPI.checkForUpdates();
            if (updateInfo.updateAvailable) {
                this.showUpdatePopup(updateInfo);
            }
            return updateInfo;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return { updateAvailable: false, error: error.message };
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.updateManager = new ClientUpdateManager();
});

window.ClientUpdateManager = ClientUpdateManager;