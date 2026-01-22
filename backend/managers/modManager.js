const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { getModsPath } = require('../core/paths');
const { saveModsToConfig, loadModsFromConfig } = require('../core/config');
const profileManager = require('./profileManager');

function generateModId(filename) {
  return crypto.createHash('md5').update(filename).digest('hex').substring(0, 8);
}

function extractModName(filename) {
  let name = path.parse(filename).name;

  name = name.replace(/-v?\d+\.[\d\.]+.*$/i, '');
  name = name.replace(/-\d+\.[\d\.]+.*$/i, '');

  name = name.replace(/[-_]/g, ' ');
  name = name.replace(/\b\w/g, l => l.toUpperCase());

  return name || 'Unknown Mod';
}

function extractVersion(filename) {
  const versionMatch = filename.match(/v?(\d+\.[\d\.]+)/);
  return versionMatch ? versionMatch[1] : null;
}

// Helper to get mods from active profile
function getProfileMods() {
  const profile = profileManager.getActiveProfile();
  return profile ? (profile.mods || []) : [];
}

async function loadInstalledMods(modsPath) {
  try {
    const activeProfile = profileManager.getActiveProfile();
    if (!activeProfile) return [];

    const profileMods = activeProfile.mods || [];
    const profileModFiles = new Set(profileMods.map(m => m.fileName));

    // We only return mods that are explicitly in the profile
    // Check which ones are physically present (either in mods/ or DisabledMods/)

    const physicalModsPath = modsPath; // .../mods
    const disabledModsPath = path.join(path.dirname(modsPath), 'DisabledMods');

    const validMods = [];

    for (const modConfig of profileMods) {
      // Check if file exists in either location
      const inEnabled = fs.existsSync(path.join(physicalModsPath, modConfig.fileName));
      const inDisabled = fs.existsSync(path.join(disabledModsPath, modConfig.fileName));

      if (inEnabled || inDisabled) {
        validMods.push({
          ...modConfig,
          // Set filePath based on physical location
          filePath: inEnabled ? path.join(physicalModsPath, modConfig.fileName) : path.join(disabledModsPath, modConfig.fileName),
          enabled: modConfig.enabled !== false // Default true
        });
      } else {
        console.warn(`[ModManager] Mod ${modConfig.fileName} listed in profile but not found on disk.`);
        // Include it so user can see it's missing or remove it
        validMods.push({
          ...modConfig,
          filePath: null,
          missing: true,
          enabled: modConfig.enabled !== false
        });
      }
    }

    return validMods;
  } catch (error) {
    console.error('Error loading installed mods:', error);
    return [];
  }
}

async function downloadMod(modInfo) {
  try {
    const modsPath = await getModsPath();

    if (!modInfo.downloadUrl && !modInfo.fileId) {
      throw new Error('No download URL or file ID provided');
    }

    let downloadUrl = modInfo.downloadUrl;

    if (!downloadUrl && modInfo.fileId && modInfo.modId) {
      const response = await axios.get(`https://api.curseforge.com/v1/mods/${modInfo.modId}/files/${modInfo.fileId}`, {
        headers: {
          'x-api-key': modInfo.apiKey,
          'Accept': 'application/json'
        }
      });

      downloadUrl = response.data.data.downloadUrl;
    }

    if (!downloadUrl) {
      throw new Error('Could not determine download URL');
    }

    const fileName = modInfo.fileName || `mod-${modInfo.modId}.jar`;
    const filePath = path.join(modsPath, fileName);

    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        // NEW: Update Active Profile instead of global config
        const activeProfile = profileManager.getActiveProfile();
        if (activeProfile) {
          const newMod = {
            id: modInfo.id || generateModId(fileName),
            name: modInfo.name || extractModName(fileName),
            version: modInfo.version || '1.0.0',
            description: modInfo.summary || modInfo.description || 'Downloaded from CurseForge',
            author: modInfo.author || 'Unknown',
            enabled: true,
            fileName: fileName,
            fileSize: fs.statSync(filePath).size,
            dateInstalled: new Date().toISOString(),
            curseForgeId: modInfo.modId,
            curseForgeFileId: modInfo.fileId
          };

          const updatedMods = [...(activeProfile.mods || []), newMod];
          profileManager.updateProfile(activeProfile.id, { mods: updatedMods });

          resolve({
            success: true,
            filePath: filePath,
            fileName: fileName,
            modInfo: newMod
          });
        } else {
          reject(new Error('No active profile to save mod to'));
        }
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('Error downloading mod:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function uninstallMod(modId, modsPath) {
  try {
    const activeProfile = profileManager.getActiveProfile();
    if (!activeProfile) throw new Error('No active profile');

    const profileMods = activeProfile.mods || [];
    const mod = profileMods.find(m => m.id === modId);

    if (!mod) {
      throw new Error('Mod not found in profile');
    }

    const disabledModsPath = path.join(path.dirname(modsPath), 'DisabledMods');
    const enabledPath = path.join(modsPath, mod.fileName);
    const disabledPath = path.join(disabledModsPath, mod.fileName);

    let fileRemoved = false;
    // Try to remove file from both locations to be safe
    if (fs.existsSync(enabledPath)) {
      fs.unlinkSync(enabledPath);
      fileRemoved = true;
    }
    if (fs.existsSync(disabledPath)) {
      try { fs.unlinkSync(disabledPath); fileRemoved = true; } catch (e) { }
    }

    if (!fileRemoved) {
      console.warn('Mod file not found on filesystem, removing from profile anyway');
    }

    const updatedMods = profileMods.filter(m => m.id !== modId);
    profileManager.updateProfile(activeProfile.id, { mods: updatedMods });

    console.log('Mod removed from profile');

    return { success: true };
  } catch (error) {
    console.error('Error uninstalling mod:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function toggleMod(modId, modsPath) {
  try {
    const activeProfile = profileManager.getActiveProfile();
    if (!activeProfile) throw new Error('No active profile');

    const profileMods = activeProfile.mods || [];
    const modIndex = profileMods.findIndex(m => m.id === modId);

    if (modIndex === -1) {
      throw new Error('Mod not found in profile');
    }

    const mod = profileMods[modIndex];
    const newEnabled = !mod.enabled; // Toggle

    // Update Profile First
    const updatedMods = [...profileMods];
    updatedMods[modIndex] = { ...mod, enabled: newEnabled };
    profileManager.updateProfile(activeProfile.id, { mods: updatedMods });

    // Manually move the file to reflect the new state
    const disabledModsPath = path.join(path.dirname(modsPath), 'DisabledMods');
    if (!fs.existsSync(disabledModsPath)) fs.mkdirSync(disabledModsPath, { recursive: true });

    const currentPath = mod.enabled ? path.join(modsPath, mod.fileName) : path.join(disabledModsPath, mod.fileName);

    // Determine target paths

    const targetDir = newEnabled ? modsPath : disabledModsPath;
    const targetPath = path.join(targetDir, mod.fileName);

    if (fs.existsSync(currentPath)) {
      fs.renameSync(currentPath, targetPath);
    } else {
      // Fallback: check if it's already in target?


      if (fs.existsSync(targetPath)) {
        // It's already there, maybe just state was wrong.

        console.log(`[ModManager] Mod ${mod.fileName} is already in the correct state`);

      } else {
        // Try finding it
        const altPath = mod.enabled ? path.join(disabledModsPath, mod.fileName) : path.join(modsPath, mod.fileName);
        if (fs.existsSync(altPath)) fs.renameSync(altPath, targetPath);
      }
    }

    return { success: true, enabled: newEnabled };
  } catch (error) {
    console.error('Error toggling mod:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncModsForCurrentProfile() {
  try {
    const activeProfile = profileManager.getActiveProfile();
    if (!activeProfile) {
      console.warn('No active profile found during mod sync');
      return;
    }

    console.log(`[ModManager] Syncing mods for profile: ${activeProfile.name}`);

    const modsPath = await getModsPath();
    const disabledModsPath = path.join(path.dirname(modsPath), 'DisabledMods');

    if (!fs.existsSync(disabledModsPath)) {
      fs.mkdirSync(disabledModsPath, { recursive: true });
    }

    // Get all physical files from both folders
    const enabledFiles = fs.existsSync(modsPath) ? fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.zip')) : [];
    const disabledFiles = fs.existsSync(disabledModsPath) ? fs.readdirSync(disabledModsPath).filter(f => f.endsWith('.jar') || f.endsWith('.zip')) : [];

    const allFiles = new Set([...enabledFiles, ...disabledFiles]);

    // Profile.mods contains the list of ALL mods for that profile, with their enabled state.

    const profileMods = activeProfile.mods || [];

    for (const fileName of allFiles) {
      const modConfig = profileMods.find(m => m.fileName === fileName);
      const shouldBeEnabled = modConfig && modConfig.enabled !== false; // Default to true if in list, unless explicitly false

      // Logic:
      // If it should be enabled -> Move to mods/
      // If it should be disabled -> Move to DisabledMods/

      const currentPath = enabledFiles.includes(fileName) ? path.join(modsPath, fileName) : path.join(disabledModsPath, fileName);
      const targetDir = shouldBeEnabled ? modsPath : disabledModsPath;
      const targetPath = path.join(targetDir, fileName);

      if (path.dirname(currentPath) !== targetDir) {
        console.log(`[Mod Sync] Moving ${fileName} to ${shouldBeEnabled ? 'Enabled' : 'Disabled'}`);
        try {
          fs.renameSync(currentPath, targetPath);
        } catch (err) {
          console.error(`Failed to move ${fileName}: ${err.message}`);
        }
      }
    }

    return { success: true };

  } catch (error) {
    console.error('[ModManager] Error syncing mods:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadInstalledMods,
  downloadMod,
  uninstallMod,
  toggleMod,
  syncModsForCurrentProfile,
  generateModId,
  extractModName,
  extractVersion
};
