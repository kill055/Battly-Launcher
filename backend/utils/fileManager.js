const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function downloadFile(url, dest, progressCallback, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Download attempt ${attempt + 1}/${maxRetries} for ${url}`);

      if (attempt > 0 && progressCallback) {
        progressCallback(`Retry ${attempt}/${maxRetries - 1}...`, null, null, null, null);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Délai progressif
      }

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 60000, // 60 secondes timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://launcher.hytale.com/',
          'Connection': 'keep-alive'
        },
        // Configuration Axios pour la robustesse réseau
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        },
        // Retry configuration
        maxRedirects: 5,
        // Network resilience
        family: 4 // Force IPv4
      });

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;
      let lastProgressTime = Date.now();
      const startTime = Date.now();

      // Nettoyer le fichier de destination s'il existe
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }

      const writer = fs.createWriteStream(dest);
      let downloadStalled = false;
      let stalledTimeout = null;

      response.data.on('data', (chunk) => {
        downloaded += chunk.length;
        const now = Date.now();

        // Reset stalled timer on data received
        if (stalledTimeout) {
          clearTimeout(stalledTimeout);
        }

        // Set new stalled timer (30 seconds without data = stalled)
        stalledTimeout = setTimeout(() => {
          downloadStalled = true;
          writer.destroy();
          response.data.destroy();
        }, 30000);

        if (progressCallback && totalSize > 0 && (now - lastProgressTime > 100)) { // Update every 100ms max
          const percent = Math.min(100, Math.max(0, (downloaded / totalSize) * 100));
          const elapsed = (now - startTime) / 1000;
          const speed = elapsed > 0 ? downloaded / elapsed : 0;
          progressCallback(null, percent, speed, downloaded, totalSize);
          lastProgressTime = now;
        }
      });

      response.data.on('error', (error) => {
        if (stalledTimeout) {
          clearTimeout(stalledTimeout);
        }
        console.error(`Stream error on attempt ${attempt + 1}:`, error.code || error.message);
        writer.destroy();
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', () => {
          if (stalledTimeout) {
            clearTimeout(stalledTimeout);
          }
          if (!downloadStalled) {
            console.log(`Download completed successfully on attempt ${attempt + 1}`);
            resolve();
          } else {
            reject(new Error('Download stalled'));
          }
        });

        writer.on('error', (error) => {
          if (stalledTimeout) {
            clearTimeout(stalledTimeout);
          }
          reject(error);
        });

        response.data.on('error', (error) => {
          if (stalledTimeout) {
            clearTimeout(stalledTimeout);
          }
          reject(error);
        });
      });

      // Si on arrive ici, le téléchargement a réussi
      return;

    } catch (error) {
      lastError = error;
      console.error(`Download attempt ${attempt + 1} failed:`, error.code || error.message);

      // Nettoyer le fichier partiel en cas d'erreur
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(dest);
        } catch (cleanupError) {
          console.warn('Could not cleanup partial file:', cleanupError.message);
        }
      }

      // Vérifier si c'est une erreur réseau que l'on peut retry
      const retryableErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO'];
      const isRetryable = retryableErrors.includes(error.code) ||
        error.message.includes('timeout') ||
        error.message.includes('stalled') ||
        (error.response && error.response.status >= 500);

      if (!isRetryable || attempt === maxRetries - 1) {
        console.error(`Non-retryable error or max retries reached: ${error.code || error.message}`);

        break;
      }

      console.log(`Retryable error detected, will retry in ${2000 * (attempt + 1)}ms...`);
    }
  }

  throw new Error(`Download failed after ${maxRetries} attempts. Last error: ${lastError?.code || lastError?.message || 'Unknown error'}`);
}

function findHomePageUIPath(gameLatest) {
  function searchDirectory(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile() && item.name === 'HomePage.ui') {
          return path.join(dir, item.name);
        } else if (item.isDirectory()) {
          const found = searchDirectory(path.join(dir, item.name));
          if (found) {
            return found;
          }
        }
      }
    } catch (error) {
    }

    return null;
  }

  if (!fs.existsSync(gameLatest)) {
    return null;
  }

  return searchDirectory(gameLatest);
}

function findLogoPath(gameLatest) {
  function searchDirectory(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile() && item.name === 'Logo@2x.png') {
          return path.join(dir, item.name);
        } else if (item.isDirectory()) {
          const found = searchDirectory(path.join(dir, item.name));
          if (found) {
            return found;
          }
        }
      }
    } catch (error) {
    }

    return null;
  }

  if (!fs.existsSync(gameLatest)) {
    return null;
  }

  return searchDirectory(gameLatest);
}

module.exports = {
  downloadFile,
  findHomePageUIPath,
  findLogoPath
};
