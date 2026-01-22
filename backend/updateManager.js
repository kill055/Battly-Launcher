const axios = require('axios');

const UPDATE_CHECK_URL = 'https://files.hytalef2p.com/api/version_launcher';
const CURRENT_VERSION = '2.0.2';
const GITHUB_DOWNLOAD_URL = 'https://github.com/amiayweb/Hytale-F2P/';

class UpdateManager {
    constructor() {
        this.updateAvailable = false;
        this.remoteVersion = null;
    }

    async checkForUpdates() {
        try {
            console.log('Checking for updates...');
            console.log(`Local version: ${CURRENT_VERSION}`);
            
            const response = await axios.get(UPDATE_CHECK_URL, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Hytale-F2P-Launcher'
                }
            });

            if (response.data && response.data.launcher_version) {
                this.remoteVersion = response.data.launcher_version;
                console.log(`Remote version: ${this.remoteVersion}`);
                
                if (this.remoteVersion !== CURRENT_VERSION) {
                    this.updateAvailable = true;
                    console.log('Update available!');
                    return {
                        updateAvailable: true,
                        currentVersion: CURRENT_VERSION,
                        newVersion: this.remoteVersion,
                        downloadUrl: GITHUB_DOWNLOAD_URL
                    };
                } else {
                    console.log('Launcher is up to date');
                    return {
                        updateAvailable: false,
                        currentVersion: CURRENT_VERSION,
                        newVersion: this.remoteVersion
                    };
                }
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('Error checking for updates:', error.message);
            return {
                updateAvailable: false,
                error: error.message,
                currentVersion: CURRENT_VERSION
            };
        }
    }

    getDownloadUrl() {
        return GITHUB_DOWNLOAD_URL;
    }

    getUpdateInfo() {
        return {
            updateAvailable: this.updateAvailable,
            currentVersion: CURRENT_VERSION,
            remoteVersion: this.remoteVersion,
            downloadUrl: this.getDownloadUrl()
        };
    }
}

module.exports = UpdateManager;