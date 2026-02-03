/**
 * @author TECNO BROS
 
 */

const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const AnalyticsHelper = require('./assets/js/utils/analyticsHelper.js');
import * as NBT from "../../../../../node_modules/nbtify/dist/index.js";
import { LoadAPI } from "../../utils/loadAPI.js";
const { loadMinecraftJavaCore } = require('./assets/js/utils/library-loader');
const { Client } = require("minecraft-launcher-core");
let Launcher = null; // Se cargará dinámicamente cuando se necesite
import { consoleOutput } from "../logger.js";
let consoleOutput_ = + consoleOutput;
import { logger, database, changePanel } from "../../utils.js";
import { CrashReport } from "../crash-report.js";
const dataDirectory = process.env.APPDATA || (process.platform == "darwin" ? `${process.env.HOME}/Library/Application Support` : process.env.HOME);
const ShowCrashReport = new CrashReport().ShowCrashReport;
const https = require("https");
const { getValue, setValue } = require('./assets/js/utils/storage');
const fsPromises = require("fs/promises");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");
const AdmZip = require("adm-zip");
const { createWriteStream, existsSync } = require("fs");

import { LoadMinecraft } from "../load-minecraft.js";
const LaunchMinecraft = new LoadMinecraft().LaunchMinecraft;

// Array de datos curiosos aleatorios para mostrar durante la descarga
const funFacts = [
    "Battly fue creado originalmente solo para que su fundador, Ilyas (1ly4s0), pudiera jugar Minecraft con comodidad y personalización total.",
    "Tras la caída de varios launchers debido a acusaciones de virus, Battly pasó de ser un proyecto personal a convertirse en un proyecto público seguro y transparente.",
    "El nombre Battly es originario de la palabra 'battle' que significa batalla en inglés, referencia hacia las batallas que se pueden llevar a cabo en Minecraft.",
    "OptiFine es un mod que optimiza Minecraft y añade soporte para texturas HD y shaders avanzados.",
    "Minecraft fue creado originalmente por Markus 'Notch' Persson en 2009.",
    "El primer bloque colocado en Minecraft fue el de piedra.",
    "Los Creepers fueron creados por error al intentar programar un cerdo.",
    "Minecraft tiene más de 200 millones de copias vendidas en todo el mundo.",
    "El End fue añadido en la versión Beta 1.9 de Minecraft.",
    "Forge es uno de los loaders de mods más antiguos y populares para Minecraft.",
    "Fabric es conocido por ser más ligero y rápido que otros mod loaders.",
    "En Minecraft puedes encontrar más de 150 biomas diferentes.",
    "El disco de música '11' de Minecraft contiene sonidos misteriosos y perturbadores.",
    "Las tortugas marinas en Minecraft siempre regresan a la playa donde nacieron para poner sus huevos.",
    "El Wither es uno de los dos jefes que puedes invocar en Minecraft, siendo el otro el Ender Dragon."
];


// Función para obtener un dato curioso aleatorio
function getRandomFunFact() {
    return funFacts[Math.floor(Math.random() * funFacts.length)];
}

class Download {
    async HandleDownloadPanel() {
        // Ensure StringLoader is initialized and strings are loaded
        if (!window.stringLoader) {
            const { StringLoader } = require("../stringLoader.js");
            window.stringLoader = new StringLoader();
        }
        await window.stringLoader.loadStrings();

        const [battlyConfig, Versions, VersionsMojang, db] = await Promise.all([
            new LoadAPI().GetConfig(),
            new LoadAPI().GetVersions(),
            new LoadAPI().GetVersionsMojang(),
            new database().init()
        ]);

        console.log(window.getString("download.title"));

        console.log("Descargando versión de Minecraft...");
        // Variables para almacenar los datos de las versiones
        let versionMojangData = VersionsMojang.versions;
        let versionBattlyData = Versions.versions;

        // Clasificar las versiones de Mojang
        let snapshots = versionMojangData.filter(v => v.type === "snapshot");
        let releases = versionMojangData.filter(v => v.type === "release");
        let betas = versionMojangData.filter(v => v.type === "old_beta");
        let alphas = versionMojangData.filter(v => v.type === "old_alpha");

        // Clasificar las versiones de Battly
        let forgeVersions = versionBattlyData.filter(v => v.version.endsWith("-forge"));
        let fabricVersions = versionBattlyData.filter(v => v.version.endsWith("-fabric"));
        let quiltVersions = versionBattlyData.filter(v => v.version.endsWith("-quilt"));
        let optifineVersions = versionBattlyData.filter(v => v.version.endsWith("-optifine"));
        let neoforgeVersions = versionBattlyData.filter(v => v.version.endsWith("-neoforge"));
        let legacyfabricVersions = versionBattlyData.filter(v => v.version.endsWith("-legacyfabric"));
        let clients = versionBattlyData.filter(v => v.type === "client");

        // Crear el modal
        const modalDownloadPanel = document.createElement('div');
        modalDownloadPanel.classList.add('modal', 'is-active');
        modalDownloadPanel.innerHTML = `
<div class="modal-background"></div>
<div class="modal-content download-modal-panel" style="scrollbar-width: none;">
    <div class="download-panel">
        <div class="download-panel-left">
            <div>
                <h1>${window.stringLoader.getString("download.title")}</h1>
                <p>${window.stringLoader.getString("download.subtitle")}</p>
            </div>
            <p class="small">
                ${window.stringLoader.getString("download.disclaimer")}
            </p>
        </div>
        <div class="download-panel-right" id="download-panel-right-version">
            <div class="download-panel-right-typeof-version download-panel-panel active" id="version-type-panel">
                <div class="radio-input" id="typeof-version">
                    <!-- Opciones de tipo de versión -->
                    <label class="label">
                        <input type="radio" id="value-1" name="value-radio" value="download-vanilla">
                        <p class="texto">${window.stringLoader.getString("download.types.vanilla")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-2" name="value-radio" value="download-forge">
                        <p class="texto">${window.stringLoader.getString("download.types.forge")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-3" name="value-radio" value="download-fabric">
                        <p class="texto">${window.stringLoader.getString("download.types.fabric")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-4" name="value-radio" value="download-quilt">
                        <p class="texto">${window.stringLoader.getString("download.types.quilt")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-5" name="value-radio" value="download-optifine">
                        <p class="texto">${window.stringLoader.getString("download.types.optifine")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-6" name="value-radio" value="download-neoforge">
                        <p class="texto">${window.stringLoader.getString("download.types.neoforge")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-7" name="value-radio" value="download-legacyfabric">
                        <p class="texto">${window.stringLoader.getString("download.types.legacyfabric")}</p>
                    </label>
                    <label class="label">
                        <input type="radio" id="value-8" name="value-radio" value="download-clients">
                        <p class="texto">${window.stringLoader.getString("download.types.clients")}</p>
                    </label>
                </div>
            </div>
            <!-- Panel para tipos de versiones de Vanilla -->
            <div class="download-panel-right-version download-panel-panel not-active" id="vanilla-type-panel">
                <h1 style="position: sticky; top: 0; z-index: 10;" id="download-panel-search-version-text">
                    ${window.stringLoader.getString("download.selectVanillaType")}
                </h1>
                <div class="radio-input" id="vanilla-version-types">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>
            <!-- Panel para la lista de versiones -->
            <div class="download-panel-right-version download-panel-panel not-active" id="version-list-panel">
                <h1 style="position: sticky; top: 0; z-index: 10;" id="download-panel-search-version-text">
                    ${window.stringLoader.getString("download.selectVersion")}
                </h1>
                <input style="position: sticky; top: 0; z-index: 10;" type="text" class="input is-small classed-home-download-input" placeholder="${window.stringLoader.getString("download.searchVersion")}" id="download-panel-search-version" />
                <div class="radio-input" id="version-list">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>

            <!-- Nuevo panel para las subversiones específicas de Forge -->
            <div class="download-panel-right-version download-panel-panel not-active" id="forge-subversion-panel">
                <h1 style="position: sticky; top: 0; z-index: 10;" id="download-panel-search-forge-subversion-text">
                    ${window.stringLoader.getString("download.selectForgeSubversion")}
                </h1>
                <input style="position: sticky; top: 0; z-index: 10;" type="text" class="input is-small classed-home-download-input" placeholder="${window.stringLoader.getString("download.searchVersion")}" id="download-panel-search-forge-subversion" />
                <div class="radio-input" id="forge-subversion-list">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>

            <div class="download-panel-control-options">
                <button class="button is-info" id="download-panel-back-button" style="display:none;">${window.stringLoader.getString("download.backButton")}</button>
                <button class="button is-info" id="download-panel-download-button" style="visibility: hidden;">${window.stringLoader.getString("download.downloadButton")}</button>
            </div>
        </div>
    </div>
</div>
<button class="modal-close is-large" aria-label="close"></button>
`;

        // Insertar el modal en el cuerpo del documento
        document.body.appendChild(modalDownloadPanel);

        // Elementos del DOM
        const downloadPanelRightTypeOfVersion = document.getElementById('version-type-panel');
        const vanillaTypePanel = document.getElementById('vanilla-type-panel');
        const versionListPanel = document.getElementById('version-list-panel');
        const forgeSubversionPanel = document.getElementById('forge-subversion-panel');
        const backButton = document.getElementById('download-panel-back-button');
        const startButton = document.getElementById('download-panel-download-button');
        const versionList = document.getElementById('version-list');
        const forgeSubversionList = document.getElementById('forge-subversion-list');
        const searchInput = document.getElementById('download-panel-search-version');
        const searchForgeSubversionInput = document.getElementById('download-panel-search-forge-subversion');

        let currentPanel = downloadPanelRightTypeOfVersion;
        let panelHistory = [];
        let selectedVersion = {};

        function showPanel(nextPanel) {
            if (currentPanel !== nextPanel) {
                currentPanel.classList.remove('active');
                currentPanel.classList.add('not-active');
                panelHistory.push(currentPanel);
                setTimeout(() => {
                    currentPanel.style.display = 'none';
                    nextPanel.style.display = 'flex';
                    nextPanel.classList.remove('not-active');
                    nextPanel.classList.add('active');
                    currentPanel = nextPanel;
                    backButton.style.display = 'flex';

                    // Como se cambió de panel, resetear el botón de descargar si no hay selección
                    if (!selectedVersion.version) {
                        startButton.style.visibility = 'hidden';
                    }

                    adjustModalHeight();
                }, 500);
            }
        }

        function goBack() {
            if (panelHistory.length > 0) {
                currentPanel.classList.remove('active');
                currentPanel.classList.add('not-active');

                let previousPanel = panelHistory.pop();

                collapsePanel(currentPanel);

                currentPanel.addEventListener('transitionend', function onCollapseEnd() {
                    currentPanel.removeEventListener('transitionend', onCollapseEnd);

                    previousPanel.style.display = 'flex';
                    previousPanel.classList.remove('not-active');
                    previousPanel.classList.add('active');
                    currentPanel = previousPanel;

                    // Si hemos vuelto al panel principal, reseteamos radios, y ocultamos botón atrás y descargar
                    if (panelHistory.length === 0) {
                        document.querySelectorAll('input[name="value-radio"]').forEach(r => r.checked = false);
                        document.querySelectorAll('input[name="vanilla-type-radio"]').forEach(r => r.checked = false);
                        backButton.style.display = 'none';
                        startButton.style.visibility = 'hidden';
                        selectedVersion = {};
                    }

                    adjustModalHeight();
                });
            }
        }

        function adjustModalHeight() {
            const panel = currentPanel;
            panel.style.transition = 'none';
            panel.style.height = 'auto';
            const finalHeight = panel.scrollHeight + 'px';
            panel.style.height = '0';
            panel.offsetHeight;
            panel.style.transition = 'height 0.5s ease-in-out';
            panel.style.height = finalHeight;
        }

        function collapsePanel(panel) {
            panel.style.display = 'block';
            panel.style.transition = 'none';
            const currentHeight = panel.offsetHeight + 'px';
            panel.style.height = currentHeight;
            panel.offsetHeight;
            panel.style.transition = 'height 0.5s ease-in-out';
            panel.style.height = '0px';
            panel.addEventListener('transitionend', function onTransitionEnd() {
                panel.removeEventListener('transitionend', onTransitionEnd);
                panel.style.display = 'none';
            });
        }

        startButton.addEventListener('click', async () => {
            if (selectedVersion.version === undefined) return;

            const downloadingModalDiv = document.createElement('div');
            downloadingModalDiv.classList.add('modal', 'is-active');
            downloadingModalDiv.id = "modalDiv1-download";
            downloadingModalDiv.innerHTML = `
        <div class="modal-background"></div>
  <div class="modal-content download-modal-panel">
      <div class="download-panel">
          <div class="download-panel-left">
              <div>
                  <h1>${window.stringLoader.getString("download.downloadingTitle")}</h1>
                  <p id="progressText1-download" class="has-new-icons">${window.stringLoader.getString("download.progress")}</p>
                  <progress id="progress" class="progress is-info" style="width: 100% !important;">0%</progress>
              </div>
              <p class="small">
                  <span style="font-size: 20px; color: #fff; font-weight: 600;">${window.stringLoader.getString("download.funFact")}</span>
                  <br>
                  ${getRandomFunFact()}
              </p>
          </div>
          <div class="download-panel-right">
              <span style="font-size: 20px; color: #fff; font-weight: 600;">${window.stringLoader.getString("download.logs")}</span>
              <textarea class="textarea has-fixed-size" id="battly-logs" placeholder="${window.stringLoader.getString("download.downloadLogs")}" style="height: 200px; font-weight: 500; font-family: 'Poppins'; font-size: 15px; background-color: #212121; overflow: hidden; font-size: 13px;" disabled></textarea>
              <button class="button is-info is-small is-fullwidth" style="border-radius: 10px; margin-top: 10px; font-weight: 500; font-family: 'Poppins';">${window.stringLoader.getString("download.saveLogs")}</button>
          </div>
      </div>
  </div>
  `;

            const pkg = require("../package.json");
            let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
            let account = await db?.getSelectedAccount();
            let ram = (await db.get("1234", "ram")).value;
            let Resolution = (await db.get("1234", "screen")).value;
            let launcherSettings = (await db.get("1234", "launcher"))
                .value;


            if (selectedVersion.type === "fabric" || selectedVersion.type === "quilt" || selectedVersion.type === "neoforge" || selectedVersion.type === "legacyfabric") {
                const opts = {
                    url:
                        battlyConfig.game_url === "" ||
                            battlyConfig.game_url === undefined
                            ? `${urlpkg}/files`
                            : battlyConfig.game_url,
                    authenticator: account,
                    detached: false,
                    timeout: 10000,
                    version: selectedVersion.version.replace(`-${selectedVersion.type}`, ""),
                    path: `${dataDirectory}/.battly`,
                    overrides: {
                        detached: false,
                        screen: screen,
                    },
                    loader: {
                        enable: true,
                        type: selectedVersion.type,
                        build: "latest",
                    },
                    downloadFileMultiple: 40,
                    verify: false,
                    java: false,
                    memory: {
                        min: `${ram.ramMin * 1024}M`,
                        max: `${ram.ramMax * 1024}M`,
                    },
                    JVM_ARGS: [
                        "-javaagent:authlib-injector.jar=https://api.battlylauncher.com",
                        "-Dauthlibinjector.mojangAntiFeatures=enabled",
                        "-Dauthlibinjector.noShowServerName",
                        "-Dauthlibinjector.disableHttpd",
                    ]
                };

                document.body.appendChild(downloadingModalDiv);
                modalDownloadPanel.remove();

                await LaunchMinecraft(opts);
            } else if (selectedVersion.type === "forge") {
                const opts = {
                    url:
                        battlyConfig.game_url === "" ||
                            battlyConfig.game_url === undefined
                            ? `${urlpkg}/files`
                            : battlyConfig.game_url,
                    authenticator: account,
                    detached: false,
                    timeout: 10000,
                    version: selectedVersion.version,
                    path: `${dataDirectory}/.battly`,
                    overrides: {
                        detached: false,
                        screen: screen,
                    },
                    loader: {
                        enable: true,
                        type: 'forge',
                        build: selectedVersion.loaderVersion
                    },
                    downloadFileMultiple: 40,
                    verify: false,
                    java: false,
                    memory: {
                        min: `${ram.ramMin * 1024}M`,
                        max: `${ram.ramMax * 1024}M`,
                    },
                    JVM_ARGS: [
                        "-javaagent:authlib-injector.jar=https://api.battlylauncher.com",
                        "-Dauthlibinjector.mojangAntiFeatures=enabled",
                        "-Dauthlibinjector.noShowServerName",
                        "-Dauthlibinjector.disableHttpd",
                    ]
                };

                document.body.appendChild(downloadingModalDiv);
                modalDownloadPanel.remove();

                await LaunchMinecraft(opts);
            } else if (selectedVersion.type === "client") {
                LaunchClientVersion(
                    account,
                    clients.find(c => c.version === selectedVersion.version)
                );
            } else if (selectedVersion.type === "optifine") {
                LaunchOptiFineVersion(
                    account,
                    optifineVersions.find(o => o.version === selectedVersion.version)
                );
            }
            else {
                const opts = {
                    url:
                        battlyConfig.game_url === "" ||
                            battlyConfig.game_url === undefined
                            ? `${urlpkg}/files`
                            : battlyConfig.game_url,
                    authenticator: account,
                    detached: false,
                    timeout: 10000,
                    version: selectedVersion.version,
                    path: `${dataDirectory}/.battly`,
                    overrides: {
                        detached: false,
                        screen: screen,
                    },
                    loader: {
                        enable: false
                    },
                    downloadFileMultiple: 40,
                    verify: false,
                    java: false,
                    memory: {
                        min: `${ram.ramMin * 1024}M`,
                        max: `${ram.ramMax * 1024}M`,
                    },
                    JVM_ARGS: [
                        "-javaagent:authlib-injector.jar=https://api.battlylauncher.com",
                        "-Dauthlibinjector.mojangAntiFeatures=enabled",
                        "-Dauthlibinjector.noShowServerName",
                        "-Dauthlibinjector.disableHttpd",
                    ]
                };

                document.body.appendChild(downloadingModalDiv);
                modalDownloadPanel.remove();

                await LaunchMinecraft(opts);
            }
        });

        // Evento para seleccionar tipo de versión
        document.getElementById('typeof-version').addEventListener('change', async (e) => {
            if (e.target.tagName !== 'INPUT') return;
            const value = e.target.value;
            // Al cambiar de tipo de versión, ocultamos el botón descargar ya que aún no hay selección final
            startButton.style.visibility = 'hidden';

            if (value === 'download-vanilla') {
                const vanillaVersionTypesContainer = document.getElementById('vanilla-version-types');
                vanillaVersionTypesContainer.innerHTML = '';

                const vanillaVersionTypes = [
                    { id: 'release', name: window.stringLoader.getString("download.vanillaTypes.normal") },
                    { id: 'snapshot', name: window.stringLoader.getString("download.vanillaTypes.snapshot") },
                    { id: 'old_beta', name: window.stringLoader.getString("download.vanillaTypes.beta") },
                    { id: 'old_alpha', name: window.stringLoader.getString("download.vanillaTypes.alpha") }
                ];

                vanillaVersionTypes.forEach(type => {
                    vanillaVersionTypesContainer.innerHTML += `
            <label class="label">
                <input type="radio" name="vanilla-type-radio" value="${type.id}">
                <p class="texto">${type.name}</p>
            </label>
        `;
                });

                showPanel(vanillaTypePanel);

                const vanillaTypeRadios = document.getElementsByName('vanilla-type-radio');
                vanillaTypeRadios.forEach(async element => {
                    element.addEventListener('change', async (e) => {
                        startButton.style.visibility = 'hidden'; // Aún no se ha seleccionado versión final
                        const selectedType = e.target.value;

                        versionList.innerHTML = '';
                        let versionsToDisplay = [];

                        if (selectedType === 'release') {
                            versionsToDisplay = releases;
                        } else if (selectedType === 'snapshot') {
                            versionsToDisplay = snapshots;
                        } else if (selectedType === 'old_beta') {
                            versionsToDisplay = betas;
                        } else if (selectedType === 'old_alpha') {
                            versionsToDisplay = alphas;
                        }

                        versionsToDisplay.forEach(version => {
                            versionList.innerHTML += `
                    <label class="label">
                        <input type="radio" name="version-radio" value="${version.id}">
                        <p class="texto">${version.id}</p>
                    </label>
                `;
                        });


                        versionList.addEventListener('change', (e) => {
                            if (e.target.tagName !== 'INPUT') return;
                            const value = e.target.value;

                            selectedVersion = {
                                version: value,
                                type: 'vanilla'
                            }

                            console.log(selectedVersion);

                            startButton.style.visibility = 'visible';
                        });

                        showPanel(versionListPanel);

                        searchInput.value = '';
                        searchInput.addEventListener('input', (e) => {
                            const searchValue = e.target.value.toLowerCase();
                            const labels = versionList.getElementsByClassName('label');
                            Array.from(labels).forEach(label => {
                                const versionName = label.querySelector('.texto').textContent.toLowerCase();
                                if (versionName.includes(searchValue)) {
                                    label.style.display = 'flex';
                                } else {
                                    label.style.display = 'none';
                                }
                            });
                        });
                    });
                });
            } else if (value === 'download-clients') {
                startButton.style.visibility = 'hidden';
                versionList.innerHTML = '';

                clients.forEach(client => {
                    versionList.innerHTML += `
            <label class="label">
                <input type="radio" name="version-radio" value="${client.version}">
                <p class="texto">${client.name}</p>
            </label>
        `;
                });

                versionList.addEventListener('change', (e) => {
                    if (e.target.tagName !== 'INPUT') return;
                    const value = e.target.value;

                    selectedVersion = {
                        version: value,
                        type: 'client'
                    }

                    console.log(selectedVersion);

                    startButton.style.visibility = 'visible';
                });

                showPanel(versionListPanel);

                searchInput.value = '';
                searchInput.addEventListener('input', (e) => {
                    const searchValue = e.target.value.toLowerCase();
                    const labels = versionList.getElementsByClassName('label');
                    Array.from(labels).forEach(label => {
                        const versionName = label.querySelector('.texto').textContent.toLowerCase();
                        if (versionName.includes(searchValue)) {
                            label.style.display = 'flex';
                        } else {
                            label.style.display = 'none';
                        }
                    });
                });
            } else if (value === 'download-forge') {
                startButton.style.visibility = 'hidden';
                const forgeMinecraftVersions = forgeVersions;
                versionList.innerHTML = '';

                forgeMinecraftVersions.forEach(mcVersion => {
                    versionList.innerHTML += `
            <label class="label">
                <input type="radio" name="forge-mc-version-radio" value="${mcVersion.version}">
                <p class="texto">${mcVersion.realVersion}</p>
            </label>
        `;
                });

                showPanel(versionListPanel);

                const forgeMcVersionRadios = document.getElementsByName('forge-mc-version-radio');
                forgeMcVersionRadios.forEach(element => {
                    element.addEventListener('change', async (e) => {
                        startButton.style.visibility = 'hidden';
                        const selectedMcVersionFull = e.target.value;
                        const selectedMcVersion = selectedMcVersionFull.replace('-forge', '');

                        const forgeApiUrl = 'https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json';
                        try {
                            let response = await fetch(forgeApiUrl);
                            let forgeData = await response.json();

                            let forgeVersionsArray = forgeData[selectedMcVersion] || [];
                            forgeVersionsArray.reverse();

                            forgeSubversionList.innerHTML = '';
                            forgeVersionsArray.forEach(forgeVersion => {
                                forgeSubversionList.innerHTML += `
                      <label class="label">
                          <input type="radio" name="forge-subversion-radio" value="${forgeVersion}">
                          <p class="texto">${forgeVersion}</p>
                      </label>
                  `;
                            });

                            const forgeSubversionRadios = document.getElementsByName('forge-subversion-radio');
                            forgeSubversionRadios.forEach(radio => {
                                radio.addEventListener('change', (e) => {
                                    const forgeVersionSelected = e.target.value;
                                    selectedVersion = {
                                        version: selectedMcVersion,
                                        type: 'forge',
                                        loaderVersion: forgeVersionSelected
                                    };
                                    console.log(selectedVersion);
                                    startButton.style.visibility = 'visible';
                                });
                            });

                            showPanel(forgeSubversionPanel);

                            searchForgeSubversionInput.value = '';
                            searchForgeSubversionInput.addEventListener('input', (e) => {
                                const searchValue = e.target.value.toLowerCase();
                                const labels = forgeSubversionList.getElementsByClassName('label');
                                Array.from(labels).forEach(label => {
                                    const versionName = label.querySelector('.texto').textContent.toLowerCase();
                                    if (versionName.includes(searchValue)) {
                                        label.style.display = 'flex';
                                    } else {
                                        label.style.display = 'none';
                                    }
                                });
                            });
                        } catch (error) {
                            console.error('Error al obtener subversiones de Forge:', error);
                        }
                    });
                });
            } else {
                // Otras opciones
                startButton.style.visibility = 'hidden';
                const selectedMod = value.replace('download-', '');
                let versionsToDisplay = [];

                if (selectedMod === 'fabric') {
                    versionsToDisplay = fabricVersions;
                } else if (selectedMod === 'quilt') {
                    versionsToDisplay = quiltVersions;
                } else if (selectedMod === 'optifine') {
                    versionsToDisplay = optifineVersions;
                } else if (selectedMod === 'neoforge') {
                    versionsToDisplay = neoforgeVersions;
                } else if (selectedMod === 'legacyfabric') {
                    versionsToDisplay = legacyfabricVersions;
                }

                versionList.innerHTML = '';
                versionsToDisplay.forEach(version => {
                    const useReal = ["fabric", "neoforge", "legacyfabric", "quilt", "optifine"]
                        .some(loader => version.version.toLowerCase().includes(loader));

                    versionList.innerHTML += `
        <label class="label">
            <input type="radio" name="version-radio" value="${version.version}">
            <p class="texto">${useReal ? version.realVersion : version.name}</p>
        </label>
    `;
                });


                versionList.addEventListener('change', (e) => {
                    if (e.target.tagName !== 'INPUT') return;
                    const value = e.target.value;

                    selectedVersion = {
                        version: value,
                        type: selectedMod
                    }

                    console.log(selectedVersion);

                    startButton.style.visibility = 'visible';
                });

                showPanel(versionListPanel);

                searchInput.value = '';
                searchInput.addEventListener('input', (e) => {
                    const searchValue = e.target.value.toLowerCase();
                    const labels = versionList.getElementsByClassName('label');
                    Array.from(labels).forEach(label => {
                        const versionName = label.querySelector('.texto').textContent.toLowerCase();
                        if (versionName.includes(searchValue)) {
                            label.style.display = 'flex';
                        } else {
                            label.style.display = 'none';
                        }
                    });
                });
            }
        });

        // Evento para el botón de volver
        backButton.addEventListener('click', () => {
            goBack();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            const modalPanel = document.querySelector('.download-modal-panel');
            modalPanel.style.height = '0';
            modalDownloadPanel.remove();
        });


        async function LaunchOptiFineVersion(account, optifine) {
            const pkg = require("../package.json");
            let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
            let ram = (await db.get("1234", "ram")).value;
            let Resolution = (await db.get("1234", "screen")).value;
            let launcherSettings = (await db.get("1234", "launcher"))
                .value;

            let version = optifine.version.replace("-optifine", "");
            let fileName = optifine.fileName;
            let realVersion = optifine.realVersion;
            let requiredJavaVersion = optifine.requiredJavaVersion;

            /* ────── UI helpers ────── */
            const $ = (sel, ctx = document) => ctx.querySelector(sel);
            const ui = await (async () => {
                const [downloadingVersion, progress, calculatingTime, saveLogs] = await Promise.all([
                    window.getString("download.downloadingVersion", "Descargando versión"),
                    window.getString("download.progress", "Progreso"),
                    window.getString("download.calculatingTime", "calculando tiempo"),
                    window.getString("download.saveLogs", "Guardar logs")
                ]);

                const modal = document.createElement("div");
                modal.className = "modal is-active";
                modal.innerHTML = `
                <div class="modal-background"></div>
                <div class="modal-content download-modal-panel">
                  <div class="download-panel">
                    <div class="download-panel-left">
                      <div>
                        <h1>${downloadingVersion}…</h1>
                        <p id="progressText" class="has-new-icons">
                          ${progress}: 0 % (${calculatingTime})
                        </p>
                        <progress id="progressBar" class="progress is-info" value="0" max="100"></progress>
                      </div>
                      <p class="small">
                        <span style="font-size:20px;font-weight:600;color:#fff">${await window.getString("download.funFact", "¿Sabías que?")}</span><br>
                        ${getRandomFunFact()}
                      </p>
                    </div>
                    <div class="download-panel-right">
                      <span style="font-size:20px;font-weight:600;color:#fff">${await window.getString("download.logs", "Logs")}</span>
                      <textarea id="logArea" class="textarea has-fixed-size"
                                style="height:200px;font-family:Poppins, Noto Color Emoji;font-size:13px;background:#212121;overflow:hidden"
                                disabled></textarea>
                      <button id="saveLogs" class="button is-info is-small is-fullwidth"
                              style="border-radius:10px;margin-top:10px;font-family:Poppins;font-weight:500">
                        ${saveLogs}
                      </button>
                    </div>
                  </div>
                </div>`;
                document.body.appendChild(modal);

                // Agregar evento para guardar logs de OptiFine
                $("#saveLogs", modal).addEventListener("click", () => {
                    const { shell } = require("electron");
                    const logPath = path.join(dataDirectory, ".battly", "logs", `optifine-${Date.now()}.log`);
                    fsPromises.mkdir(path.dirname(logPath), { recursive: true })
                        .then(() => fsPromises.writeFile(logPath, ui.logArea.value))
                        .then(() => shell.showItemInFolder(logPath))
                        .catch(console.error);
                });

                const downloadingFilesStr = await window.getString("download.downloadingFiles", "Descargando archivos");

                return {
                    modal,
                    progressText: $("#progressText", modal),
                    progressBar: /** @type {HTMLProgressElement} */($("#progressBar", modal)),
                    logArea: /** @type {HTMLTextAreaElement} */($("#logArea", modal)),
                    log(msg, emoji = "🔄") {
                        this.logArea.value += `${emoji} ${msg}\n`;
                        this.logArea.scrollTop = this.logArea.scrollHeight;
                    },
                    setPct(p) {
                        this.progressBar.value = p;
                        this.progressText.textContent = `🔄 ${downloadingFilesStr}… ${p}%`;
                    }
                };
            })();

            ipcRenderer.send("main-window-progress-loading");

            try {
                /* ─── Load all needed strings ─── */
                const [
                    downloadTheVersionInVanilla, creatingFolder, folder, createdSuccessfully,
                    downloading, errorDownloading, downloadedSuccessfully, downloadingJarFileOf,
                    downloadingFile, downloadingFilesCompleted, downloadingAssets, errorDetectedOne,
                    minecraftStartedCorrectly, minecraftStartedCorrectlyBody, inTheMenu
                ] = await Promise.all([
                    window.getString("download.downloadTheVersionInVanilla", "Descarga la versión en Vanilla"),
                    window.getString("download.creatingFolder", "Creando carpeta"),
                    window.getString("common.folder", "Carpeta"),
                    window.getString("download.createdSuccessfully", "creada correctamente"),
                    window.getString("download.downloading", "Descargando"),
                    window.getString("download.errorDownloading", "Error al descargar"),
                    window.getString("download.downloadedSuccessfully", "descargado correctamente"),
                    window.getString("download.downloadingJarFileOf", "Descargando archivo JAR de"),
                    window.getString("download.downloadingFile", "Descargando archivo"),
                    window.getString("download.downloadingFilesCompleted", "Descarga de archivos completada"),
                    window.getString("download.downloadingAssets", "Descargando assets"),
                    window.getString("download.errorDetectedOne", "Error detectado"),
                    window.getString("game.minecraftStartedCorrectly", "Minecraft iniciado correctamente"),
                    window.getString("game.minecraftStartedCorrectlyBody", "Minecraft se ha iniciado correctamente."),
                    window.getString("home.inTheMenu", "en el menú")
                ]);

                /* ─── 1 · Comprobar/registrar JRE ─── */
                const javaCandidates = [
                    "jre-17.0.8-win32",
                    "jre-17.0.1.12.1-win32",
                    "jre-17.0.8-windows-x64",
                    "jre-17.0.1.12.1-windows-x64",
                ].map(p => path.join(dataDirectory, ".battly", "runtime", p, "bin", "java.exe"))
                    .filter(existsSync);

                if (!javaCandidates.length) {
                    // Verificar versión requerida de Java
                    console.log("Verificando Java requerido:");
                    console.log(requiredJavaVersion);
                    const runtimeDir = path.join(dataDirectory, ".battly", "runtime");
                    console.log("Directorio runtime:");
                    console.log(runtimeDir);

                    let folders = [];
                    if (fs.existsSync(runtimeDir)) {
                        const allFolders = fs.readdirSync(runtimeDir);
                        console.log("Todas las carpetas en runtime:");
                        console.log(allFolders);

                        if (requiredJavaVersion && requiredJavaVersion.trim() !== '') {
                            folders = allFolders.filter(f => f.startsWith(requiredJavaVersion));
                            console.log("Carpetas que empiezan con:");
                            console.log(requiredJavaVersion);
                            console.log("Resultado:");
                            console.log(folders);
                        } else {
                            console.log("requiredJavaVersion está vacío o undefined, buscando cualquier carpeta Java");
                            // Si requiredJavaVersion está vacío, buscar cualquier carpeta Java
                            folders = allFolders.filter(f =>
                                f.includes("jre-") ||
                                f.includes("java-") ||
                                f.includes("jdk-")
                            );
                            console.log("Carpetas Java encontradas:");
                            console.log(folders);
                        }
                    } else {
                        console.log("Directorio runtime no existe, será creado durante la descarga");
                        // Crear el directorio runtime si no existe
                        fs.mkdirSync(runtimeDir, { recursive: true });
                    }

                    // Primero intentar usar Java existente COMPATIBLE
                    let javaFound = false;

                    // Determinar la versión de Java requerida antes de buscar
                    let requiredJavaMajorVersion = "21"; // Por defecto Java 21 para OptiFine moderno

                    if (requiredJavaVersion && requiredJavaVersion.length > 0) {
                        if (requiredJavaVersion.includes("jre-8") ||
                            requiredJavaVersion.includes("java-8") ||
                            requiredJavaVersion.includes("1.8")) {
                            requiredJavaMajorVersion = "8";
                        } else if (requiredJavaVersion.includes("jre-11") ||
                            requiredJavaVersion.includes("java-11")) {
                            requiredJavaMajorVersion = "11";
                        } else if (requiredJavaVersion.includes("jre-17") ||
                            requiredJavaVersion.includes("java-17")) {
                            requiredJavaMajorVersion = "17";
                        } else if (requiredJavaVersion.includes("jre-21") ||
                            requiredJavaVersion.includes("java-21")) {
                            requiredJavaMajorVersion = "21";
                        } else {
                            // Intentar extraer el número de versión mayor usando regex
                            const versionMatch = requiredJavaVersion.match(/(\d+)/);
                            if (versionMatch) {
                                const extractedVersion = parseInt(versionMatch[1]);
                                if ([8, 11, 17, 21].includes(extractedVersion)) {
                                    requiredJavaMajorVersion = extractedVersion.toString();
                                }
                            }
                        }
                    }

                    console.log("Versión de Java requerida:");
                    console.log(requiredJavaMajorVersion);
                    console.log("requiredJavaVersion original:");
                    console.log(requiredJavaVersion);
                    console.log("Carpetas Java disponibles:");
                    console.log(folders);

                    if (folders.length > 0) {
                        console.log("Verificando carpetas Java existentes para compatibilidad:");
                        console.log(folders);

                        for (const folder of folders) {
                            console.log("Analizando carpeta:", folder);

                            // Función para extraer la versión mayor de Java del nombre de carpeta
                            function extractJavaVersion(folderName) {
                                // Buscar patrones como jre-8, jre-16.0.1.9.1, jre-17.0.15, etc.
                                const match = folderName.match(/(?:jre|java|jdk)-(\d+)(?:\.|\u|$)/i);
                                return match ? parseInt(match[1]) : null;
                            }

                            const folderJavaVersion = extractJavaVersion(folder);
                            const requiredVersion = parseInt(requiredJavaMajorVersion);

                            console.log(`Carpeta: ${folder} → Versión detectada: ${folderJavaVersion}, Requerida: ${requiredVersion}`);

                            // Verificar compatibilidad: versión igual o superior
                            if (folderJavaVersion && folderJavaVersion >= requiredVersion) {
                                const javaExe = process.platform === "win32" ? "java.exe" : "java";
                                const javaPath = path.join(dataDirectory, ".battly", "runtime", folder, "bin", javaExe);
                                console.log("Verificando Java compatible en:");
                                console.log(javaPath);

                                if (existsSync(javaPath)) {
                                    console.log("✅ Java compatible encontrado!");
                                    console.log(`Versión ${folderJavaVersion} es compatible con requerida ${requiredVersion}`);
                                    await setValue("java-path", javaPath);
                                    javaCandidates.push(javaPath);
                                    ui.log(`✅ Usando Java ${folderJavaVersion} existente: ${folder}`, "✅");
                                    ui.log(`🎉 Java ${folderJavaVersion} listo para usar (instalación existente)`, "🎉");
                                    ui.setPct(40);
                                    javaFound = true;
                                    break;
                                }
                            } else {
                                console.log(`❌ Java ${folderJavaVersion || 'desconocido'} no es compatible con ${requiredVersion}`);
                            }
                        }

                        if (!javaFound) {
                            console.log("No se encontró Java compatible entre las carpetas existentes. Versión buscada:");
                            console.log(requiredJavaMajorVersion);
                        }
                    }

                    if (!javaFound) {
                        // Si no se encontró Java compatible, descargar la versión requerida
                        console.log("No se encontró Java compatible. Iniciando descarga automática...");
                        console.log("Versión a descargar:");
                        console.log(requiredJavaMajorVersion);
                        ui.log(`☕ ${downloading} Java ${requiredJavaMajorVersion}...`);
                        ui.setPct(10);
                        console.log("Descargando Java versión:");
                        console.log(requiredJavaMajorVersion);

                        try {
                            // Importar la función de descarga de Java
                            const downloadJavaVersion = require('./assets/js/utils/download-java.js');

                            const javaBasePath = path.join(dataDirectory, ".battly");

                            console.log("=== DEBUG DESCARGA JAVA ===");
                            console.log("Versión solicitada:");
                            console.log(requiredJavaMajorVersion);
                            console.log("Ruta base:");
                            console.log(javaBasePath);
                            console.log("===========================");

                            // Descargar Java con progreso global mejorado
                            let lastLoggedPercent = -1;
                            let totalFiles = 0;
                            let completedFiles = 0;

                            const javaPath = await downloadJavaVersion(requiredJavaMajorVersion, {
                                basePath: javaBasePath,
                                imageType: "jre",
                                intelEnabledMac: false,
                                onProgress: (progress) => {
                                    if (progress.phase === 'file-start') {
                                        // Inicialización: conocer el total de archivos
                                        if (progress.totalFiles && totalFiles === 0) {
                                            totalFiles = progress.totalFiles;
                                            ui.log(`📥 Preparando descarga de ${totalFiles} archivos de Java ${requiredJavaMajorVersion}...`);
                                        }
                                    } else if (progress.phase === 'download') {
                                        // Progreso de descarga por archivo
                                        const filePercent = progress.percent || 0;
                                        const globalPercent = ((completedFiles + (filePercent / 100)) / totalFiles) * 100;
                                        const roundedGlobal = Math.floor(globalPercent);

                                        // Solo actualizar UI cada 5% para evitar spam
                                        if (roundedGlobal >= lastLoggedPercent + 5) {
                                            lastLoggedPercent = roundedGlobal;
                                            ui.log(`☕ Descargando Java ${requiredJavaMajorVersion}... ${roundedGlobal}%`);
                                            // Mapear progreso Java al rango 10-40% del progreso total
                                            ui.setPct(10 + (globalPercent * 0.3));
                                        }
                                    } else if (progress.phase === 'file-done') {
                                        // Archivo completado
                                        completedFiles++;
                                        const globalPercent = (completedFiles / totalFiles) * 100;

                                        if (completedFiles % Math.max(1, Math.floor(totalFiles / 10)) === 0) {
                                            ui.log(`📦 Descargados ${completedFiles}/${totalFiles} archivos (${Math.floor(globalPercent)}%)`);
                                        }
                                    } else if (progress.phase === 'extract') {
                                        ui.log(`🔧 Extrayendo Java ${requiredJavaMajorVersion}...`);
                                        ui.setPct(35); // 35% durante extracción
                                    }
                                }
                            });

                            console.log("=== RESULTADO DESCARGA ===");
                            console.log("Java instalado en:");
                            console.log(javaPath);

                            // Verificar si la ruta contiene la versión esperada
                            if (javaPath.includes(`jre-${requiredJavaMajorVersion}`)) {
                                console.log("✅ Versión correcta descargada!");
                            } else {
                                console.log("⚠️ Versión diferente a la esperada!");
                                console.log("Se esperaba jre-" + requiredJavaMajorVersion);
                                console.log("Se obtuvo:", javaPath);
                            }
                            console.log("========================");

                            // Verificación de integridad completa del Java descargado
                            ui.log("🔍 Verificando integridad de Java...");
                            ui.setPct(38);

                            try {
                                // Verificar que el ejecutable Java existe
                                if (!existsSync(javaPath)) {
                                    throw new Error("El ejecutable de Java no se encuentra en la ruta esperada");
                                }

                                const javaDir = path.dirname(path.dirname(javaPath)); // Subir dos niveles desde bin/java.exe
                                console.log("Verificando estructura en:", javaDir);

                                // Verificación básica de estructura
                                const requiredDirs = ['bin', 'lib'];
                                for (const dir of requiredDirs) {
                                    const dirPath = path.join(javaDir, dir);
                                    if (!existsSync(dirPath)) {
                                        throw new Error(`Directorio requerido no encontrado: ${dir}`);
                                    }
                                }

                                // Verificación avanzada: obtener manifiesto y verificar archivos por SHA256
                                ui.log("🔍 Verificando archivos con SHA256...");
                                ui.setPct(39);

                                let manifestData = null;
                                let totalFilesToCheck = 0;
                                let checkedFiles = 0;
                                let corruptedFiles = [];
                                let missingFiles = [];

                                try {
                                    // Intentar obtener el manifiesto desde el módulo download-java.js
                                    const downloadJavaVersion = require('./assets/js/utils/download-java.js');

                                    // Crear un callback temporal para capturar el manifiesto
                                    let capturedManifest = null;
                                    const tempCallback = {
                                        onManifestLoaded: (manifest) => {
                                            capturedManifest = manifest;
                                        }
                                    };

                                    // Intentar obtener información del manifiesto ya descargado
                                    const javaVersionMatch = path.basename(javaDir).match(/jre-(.+?)(?:-windows|-linux|-mac|$)/);
                                    const javaVersionString = javaVersionMatch ? javaVersionMatch[1] : requiredJavaMajorVersion;

                                    console.log("Buscando manifiesto para versión:", javaVersionString);

                                    // Buscar archivo de manifiesto en cache
                                    const cacheDir = path.join(dataDirectory, ".battly", "mc-assets");
                                    if (existsSync(cacheDir)) {
                                        const manifestFiles = fs.readdirSync(cacheDir).filter(f =>
                                            f.includes("manifest") && f.includes(javaVersionString)
                                        );

                                        if (manifestFiles.length > 0) {
                                            const manifestPath = path.join(cacheDir, manifestFiles[0]);
                                            console.log("Cargando manifiesto desde cache:", manifestPath);
                                            manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                                        }
                                    }

                                } catch (manifestError) {
                                    console.log("No se pudo cargar manifiesto para verificación SHA256:", manifestError.message);
                                }

                                if (manifestData && manifestData.files) {
                                    const manifestEntries = Object.entries(manifestData.files);
                                    totalFilesToCheck = manifestEntries.length;

                                    ui.log(`📋 Verificando ${totalFilesToCheck} archivos del manifiesto...`);

                                    // Función para calcular SHA1 de un archivo
                                    const crypto = require('crypto');
                                    const calculateSHA1 = (filePath) => {
                                        return new Promise((resolve, reject) => {
                                            const hash = crypto.createHash('sha1');
                                            const stream = fs.createReadStream(filePath);

                                            stream.on('data', chunk => hash.update(chunk));
                                            stream.on('end', () => resolve(hash.digest('hex')));
                                            stream.on('error', reject);
                                        });
                                    };

                                    // Verificar archivos por lotes para no bloquear la UI
                                    const batchSize = 50;
                                    for (let i = 0; i < manifestEntries.length; i += batchSize) {
                                        const batch = manifestEntries.slice(i, i + batchSize);

                                        await Promise.all(batch.map(async ([relativePath, fileInfo]) => {
                                            if (fileInfo.type === 'directory') {
                                                checkedFiles++;
                                                return;
                                            }

                                            const fullPath = path.join(javaDir, relativePath);

                                            if (!existsSync(fullPath)) {
                                                missingFiles.push({
                                                    path: relativePath,
                                                    fullPath,
                                                    info: fileInfo
                                                });
                                                console.log("❌ Archivo faltante:", relativePath);
                                            } else if (fileInfo.downloads && fileInfo.downloads.raw && fileInfo.downloads.raw.sha1) {
                                                try {
                                                    const actualSHA1 = await calculateSHA1(fullPath);
                                                    const expectedSHA1 = fileInfo.downloads.raw.sha1;

                                                    if (actualSHA1 !== expectedSHA1) {
                                                        corruptedFiles.push({
                                                            path: relativePath,
                                                            fullPath,
                                                            expectedSHA1,
                                                            actualSHA1,
                                                            info: fileInfo
                                                        });
                                                        console.log("❌ SHA1 incorrecto:", relativePath);
                                                    } else {
                                                        console.log("✅ SHA1 correcto:", relativePath);
                                                    }
                                                } catch (hashError) {
                                                    console.log("⚠️ Error calculando SHA1 para:", relativePath, hashError.message);
                                                }
                                            }

                                            checkedFiles++;
                                        }));

                                        // Actualizar progreso cada lote
                                        const progress = (checkedFiles / totalFilesToCheck) * 100;
                                        if (progress % 10 < 5) { // Actualizar cada ~10%
                                            ui.log(`📋 Verificados ${checkedFiles}/${totalFilesToCheck} archivos (${Math.floor(progress)}%)`);
                                        }
                                    }

                                    // Reportar resultados
                                    ui.log(`📊 Verificación completada: ${checkedFiles} archivos`);
                                    if (missingFiles.length > 0) {
                                        ui.log(`❌ ${missingFiles.length} archivos faltantes`);
                                    }
                                    if (corruptedFiles.length > 0) {
                                        ui.log(`❌ ${corruptedFiles.length} archivos corruptos`);
                                    }

                                    // Si hay archivos faltantes o corruptos, intentar repararlos
                                    if (missingFiles.length > 0 || corruptedFiles.length > 0) {
                                        const filesToRepair = [...missingFiles, ...corruptedFiles];
                                        ui.log(`🔧 Reparando ${filesToRepair.length} archivos...`);

                                        let repairedCount = 0;
                                        for (const fileToRepair of filesToRepair) {
                                            try {
                                                if (fileToRepair.info.downloads && fileToRepair.info.downloads.raw) {
                                                    const fileUrl = fileToRepair.info.downloads.raw.url;

                                                    // Crear directorio si no existe
                                                    const fileDir = path.dirname(fileToRepair.fullPath);
                                                    await fsPromises.mkdir(fileDir, { recursive: true });

                                                    // Descargar archivo
                                                    await new Promise((resolve, reject) => {
                                                        https.get(fileUrl, (res) => {
                                                            const fileStream = createWriteStream(fileToRepair.fullPath);
                                                            res.pipe(fileStream);
                                                            fileStream.on('finish', resolve);
                                                            fileStream.on('error', reject);
                                                        }).on('error', reject);
                                                    });

                                                    // Verificar SHA1 del archivo reparado
                                                    const repairedSHA1 = await calculateSHA1(fileToRepair.fullPath);
                                                    if (repairedSHA1 === fileToRepair.info.downloads.raw.sha1) {
                                                        console.log("✅ Archivo reparado:", fileToRepair.path);
                                                        repairedCount++;
                                                    } else {
                                                        console.log("❌ Fallo al reparar:", fileToRepair.path);
                                                    }
                                                }
                                            } catch (repairError) {
                                                console.log("❌ Error reparando:", fileToRepair.path, repairError.message);
                                            }
                                        }

                                        ui.log(`🔧 Reparados ${repairedCount}/${filesToRepair.length} archivos`);

                                        if (repairedCount < filesToRepair.length) {
                                            ui.log("⚠️ Algunos archivos no pudieron ser reparados, pero Java debería funcionar");
                                        }
                                    } else {
                                        ui.log("✅ Todos los archivos verificados correctamente");
                                    }

                                } else {
                                    console.log("Verificación SHA256 omitida - manifiesto no disponible");
                                    ui.log("🔍 Verificación básica de estructura completada");

                                    // Verificación básica de ejecutables como fallback
                                    const requiredFiles = ['bin/java.exe', 'bin/javaw.exe'];
                                    let foundExecutables = 0;
                                    for (const file of requiredFiles) {
                                        const filePath = path.join(javaDir, file);
                                        if (existsSync(filePath)) {
                                            foundExecutables++;
                                            console.log("✅ Encontrado:", file);
                                        } else {
                                            console.log("⚠️ Faltante:", file);
                                        }
                                    }

                                    if (foundExecutables === 0) {
                                        throw new Error("No se encontraron ejecutables de Java");
                                    }
                                }

                                // Verificar que el Java funciona ejecutando -help
                                ui.log("🧪 Probando funcionamiento de Java...");
                                const { spawn } = require('child_process');
                                try {
                                    await new Promise((resolve, reject) => {
                                        const javaProcess = spawn(javaPath, ['-help'], {
                                            stdio: ['ignore', 'ignore', 'pipe'],
                                            timeout: 15000
                                        });

                                        let output = '';
                                        javaProcess.stderr.on('data', (data) => {
                                            output += data.toString();
                                        });

                                        javaProcess.on('close', (code) => {
                                            if (code === 0 && output.includes('Usage:')) {
                                                ui.log("✅ Java funciona correctamente");
                                                resolve();
                                            } else {
                                                reject(new Error(`Java no responde correctamente (código: ${code})`));
                                            }
                                        });

                                        javaProcess.on('error', (error) => {
                                            reject(new Error(`Error ejecutando Java: ${error.message}`));
                                        });

                                        setTimeout(() => {
                                            javaProcess.kill();
                                            reject(new Error("Timeout esperando respuesta de Java"));
                                        }, 15000);
                                    });
                                } catch (error) {
                                    ui.log(`❌ Error probando Java: ${error.message}`);
                                    throw error;
                                }

                                ui.log(`✅ Java ${requiredJavaMajorVersion} verificado e instalado correctamente`, "✅");
                                ui.setPct(40);

                            } catch (verifyError) {
                                console.error("❌ Error en verificación de Java:", verifyError.message);
                                ui.log(`⚠️ Advertencia: ${verifyError.message}`, "⚠️");
                                ui.log("Continuando con instalación (puede funcionar parcialmente)...");
                                ui.setPct(40);
                            }

                            // Después de la descarga exitosa, el javaPath ya debería ser válido
                            if (javaPath && existsSync(javaPath)) {
                                await setValue("java-path", javaPath);
                                javaCandidates.push(javaPath);
                                console.log("✅ Java agregado a candidatos:");
                                console.log(javaPath);

                                // Log final de éxito
                                const javaFolder = path.basename(path.dirname(path.dirname(javaPath)));
                                ui.log(`🎉 Java ${requiredJavaMajorVersion} listo para usar (${javaFolder})`, "🎉");
                            } else {
                                // Buscar cualquier instalación de Java compatible en runtime
                                console.log("Buscando instalaciones de Java en runtime...");
                                const runtimeDir = path.join(dataDirectory, ".battly", "runtime");
                                if (fs.existsSync(runtimeDir)) {
                                    console.log("Explorando directorio runtime:");
                                    console.log(runtimeDir);
                                    const allFolders = fs.readdirSync(runtimeDir);
                                    console.log("Carpetas encontradas:");
                                    console.log(allFolders);

                                    // Buscar cualquier carpeta que contenga Java compatible
                                    const javaFolders = allFolders.filter(f =>
                                        f.includes(`jre-${requiredJavaMajorVersion}`) ||
                                        f.includes(`java-${requiredJavaMajorVersion}`) ||
                                        f.includes(`jdk-${requiredJavaMajorVersion}`) ||
                                        f.includes(`runtime-${requiredJavaMajorVersion}`)
                                    );

                                    console.log("Carpetas de Java encontradas:");
                                    console.log(javaFolders);

                                    for (const folder of javaFolders) {
                                        const javaExe = process.platform === "win32" ? "java.exe" : "java";
                                        const testPath = path.join(runtimeDir, folder, "bin", javaExe);
                                        console.log("Probando ruta Java:");
                                        console.log(testPath);

                                        if (existsSync(testPath)) {
                                            await setValue("java-path", testPath);
                                            javaCandidates.push(testPath);
                                            console.log("Java encontrado y agregado:");
                                            console.log(testPath);
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (javaDownloadError) {
                            console.error("Error descargando Java:");
                            console.error(javaDownloadError);
                            console.error("Stack trace:");
                            console.error(javaDownloadError.stack);
                            ui.log(`❌ Error descargando Java: ${javaDownloadError.message}`, "❌");
                            ui.modal.remove();
                            throw new Error(downloadTheVersionInVanilla + " Error: " + javaDownloadError.message);
                        }

                        // Si aún no hay candidatos después de la descarga, lanzar error
                        if (!javaCandidates.length) {
                            console.error("No se pudo encontrar Java después de la descarga. Candidatos:");
                            console.error(javaCandidates);
                            ui.modal.remove();
                            throw new Error(downloadTheVersionInVanilla + " - No se encontró Java después de la instalación");
                        }
                    }
                }

                // Verificar que tenemos al menos un candidato de Java antes de continuar
                console.log("Verificación final de candidatos Java:", javaCandidates.length > 0 ? "✅ OK" : "❌ NO");
                console.log("Lista de candidatos:", javaCandidates);

                if (!javaCandidates.length) {
                    console.error("Error final: No hay candidatos de Java disponibles");
                    ui.modal.remove();
                    throw new Error(downloadTheVersionInVanilla + " - No se pudo configurar Java automáticamente");
                }

                const finalJavaPath = javaCandidates[0];
                console.log("Usando Java:", finalJavaPath);
                await setValue("java-path", finalJavaPath);

                // Verificación final de que Java está listo
                ui.log("🔧 Verificación final del sistema Java...");
                try {
                    // Verificar que el archivo Java final existe y es ejecutable
                    if (!existsSync(finalJavaPath)) {
                        throw new Error("El ejecutable Java final no existe");
                    }

                    // Verificar permisos (en sistemas Unix-like)
                    if (process.platform !== 'win32') {
                        const stats = fs.statSync(finalJavaPath);
                        if (!(stats.mode & parseInt('111', 8))) {
                            console.log("Aplicando permisos de ejecución a Java...");
                            fs.chmodSync(finalJavaPath, stats.mode | parseInt('755', 8));
                        }
                    }

                    const javaFolder = path.basename(path.dirname(path.dirname(finalJavaPath)));
                    ui.log(`✅ Sistema Java configurado correctamente (${javaFolder})`, "✅");
                } catch (finalError) {
                    console.error("⚠️ Advertencia en verificación final:", finalError.message);
                    ui.log("⚠️ Continuando con posibles limitaciones...");
                }

                /* ─── 2 · Crear directorios necesarios ─── */
                ui.log(`${creatingFolder} libraries...`);
                await fsPromises.mkdir(path.join(dataDirectory, ".battly", "versions", fileName), { recursive: true });
                await fsPromises.mkdir(path.join(dataDirectory, ".battly", "libraries", "optifine", "OptiFine", fileName.replace("-OptiFine", "")), { recursive: true });
                await fsPromises.mkdir(path.join(dataDirectory, ".battly", "libraries", "optifine", "launchwrapper-of", "2.1"), { recursive: true });
                await fsPromises.mkdir(path.join(dataDirectory, ".battly", "libraries", "optifine", "launchwrapper-of", "2.2"), { recursive: true });
                await fsPromises.mkdir(path.join(dataDirectory, ".battly", "libraries", "optifine", "launchwrapper-of", "2.3"), { recursive: true });
                ui.log(`${folder} OptiFine ${createdSuccessfully}`, "✅");
                ui.setPct(20);

                /* ─── 3 · Descargar archivos OptiFine ─── */
                const jarURL = `https://cdn.battlylauncher.com/desktop/optifine/${fileName}/${fileName}.jar`;
                const jsonURL = `https://cdn.battlylauncher.com/desktop/optifine/${fileName}/${fileName}.json`;

                ui.log(`${downloading} ${fileName}.jar...`);
                await new Promise((resolve, reject) => {
                    https.get(jarURL, res => {
                        if (res.statusCode !== 200) {
                            return reject(new Error(`${errorDownloading} JAR (${res.statusCode})`));
                        }
                        const jarFile = createWriteStream(path.join(dataDirectory, ".battly", "versions", fileName, `${fileName}.jar`));
                        res.pipe(jarFile);
                        jarFile.on("finish", () => {
                            jarFile.close();
                            resolve();
                        });
                    }).on("error", reject);
                });

                ui.log(`${downloading} ${fileName}.json...`);
                await new Promise((resolve, reject) => {
                    https.get(jsonURL, res => {
                        if (res.statusCode !== 200) {
                            return reject(new Error(`${errorDownloading} JSON (${res.statusCode})`));
                        }
                        const jsonFile = createWriteStream(path.join(dataDirectory, ".battly", "versions", fileName, `${fileName}.json`));
                        res.pipe(jsonFile);
                        jsonFile.on("finish", () => {
                            jsonFile.close();
                            resolve();
                        });
                    }).on("error", reject);
                });

                ui.log(`OptiFine ${downloadedSuccessfully}`, "✅");
                ui.setPct(50);

                /* ─── 4 · Descargar librerías OptiFine ─── */
                const libraryJARURL = `https://cdn.battlylauncher.com/desktop/optifine/libraries/optifine/OptiFine/${fileName.replace("-OptiFine", "")}/OptiFine-${fileName.replace("-OptiFine", "")}.jar`;

                ui.log(`${downloadingJarFileOf} OptiFine...`);
                await new Promise((resolve, reject) => {
                    https.get(libraryJARURL, res => {
                        if (res.statusCode !== 200) {
                            return reject(new Error(`${errorDownloading} library JAR (${res.statusCode})`));
                        }
                        const libraryFile = createWriteStream(path.join(dataDirectory, ".battly", "libraries", "optifine", "OptiFine", fileName.replace("-OptiFine", ""), `OptiFine-${fileName.replace("-OptiFine", "")}.jar`));
                        res.pipe(libraryFile);
                        libraryFile.on("finish", () => {
                            libraryFile.close();
                            resolve();
                        });
                    }).on("error", reject);
                });

                ui.setPct(70);

                /* ─── 5 · Descargar launchwrapper ─── */
                const wrapperURLs = [
                    { version: "2.1", url: `https://cdn.battlylauncher.com/desktop/optifine/libraries/optifine/launchwrapper-of/2.1/launchwrapper-of-2.1.jar` },
                    { version: "2.2", url: `https://cdn.battlylauncher.com/desktop/optifine/libraries/optifine/launchwrapper-of/2.2/launchwrapper-of-2.2.jar` },
                    { version: "2.3", url: `https://cdn.battlylauncher.com/desktop/optifine/libraries/optifine/launchwrapper-of/2.3/launchwrapper-of-2.3.jar` }
                ];

                for (let i = 0; i < wrapperURLs.length; i++) {
                    const wrapper = wrapperURLs[i];
                    ui.log(`${downloadingFile} launchwrapper ${wrapper.version}...`);
                    await new Promise((resolve, reject) => {
                        https.get(wrapper.url, res => {
                            if (res.statusCode !== 200) {
                                return reject(new Error(`${errorDownloading} wrapper ${wrapper.version} (${res.statusCode})`));
                            }
                            const wrapperFile = createWriteStream(path.join(dataDirectory, ".battly", "libraries", "optifine", "launchwrapper-of", wrapper.version, `launchwrapper-of-${wrapper.version}.jar`));
                            res.pipe(wrapperFile);
                            wrapperFile.on("finish", () => {
                                wrapperFile.close();
                                resolve();
                            });
                        }).on("error", reject);
                    });
                    ui.log(`launchwrapper-of-${wrapper.version} ${downloadedSuccessfully}`, "✅");
                    ui.setPct(70 + (i + 1) * 10);
                }

                ui.log(`${downloadingFilesCompleted}`, "✅");
                ui.setPct(100);

                /* ─── 6 · Lanzar OptiFine ─── */
                const javaPath = await getValue("java-path");
                const screen = Resolution.screen.width == "<auto>" ? false : {
                    width: Resolution.screen.width,
                    height: Resolution.screen.height,
                };

                const opts = {
                    url: battlyConfig.game_url || `${require("../package.json").url}/files`,
                    root: path.join(dataDirectory, ".battly"),
                    path: path.join(dataDirectory, ".battly"),
                    overrides: { detached: false, screen },
                    downloadFileMultiple: 40,
                    version: { custom: fileName, number: realVersion, type: "release" },
                    verify: false,
                    ignored: ["loader"],
                    memory: { min: `${ram.ramMin * 1024}M`, max: `${ram.ramMax * 1024}M` },
                    authorization: account, authenticator: account,
                    detached: false, timeout: 10_000,
                    java: Boolean(javaPath), javaPath,
                    customArgs: account.type === "battly" ? [
                        "-javaagent:authlib-injector.jar=https://api.battlylauncher.com",
                        "-Dauthlibinjector.mojangAntiFeatures=enabled",
                        "-Dauthlibinjector.noShowServerName",
                        "-Dauthlibinjector.disableHttpd",
                    ] : [],
                };

                const launcher = new Client();

                launcher.on("progress", p => ui.setPct(((p.task / p.total) * 100) | 0));
                launcher.on("debug", m => {
                    if (/Attempting to download assets/.test(m))
                        ui.progressText.textContent = `🔄 ${downloadingAssets}…`;
                    if (/Failed to start|Exception in thread|ClassCastException|has crashed|Unable to launch/.test(m))
                        ShowCrashReport(`${errorDetectedOne}\n${m}`);
                });
                launcher.on("data", d => {
                    if (/Setting user|Launching wrapped minecraft/.test(d) && ui.modal.isConnected) {
                        ui.modal.remove();
                        ipcRenderer.send("new-notification", {
                            title: minecraftStartedCorrectly,
                            body: minecraftStartedCorrectlyBody,
                        });
                        if (launcherSettings.launcher.close === "close-launcher")
                            ipcRenderer.send("main-window-hide");
                        ipcRenderer.send("main-window-progress-reset");
                    }
                });
                launcher.on("close", () => {
                    ipcRenderer.send("updateStatus", {
                        status: "online", details: inTheMenu, username: account.name,
                    });
                    if (ui.modal.isConnected) ui.modal.remove();
                    if (launcherSettings.launcher.close === "close-launcher")
                        ipcRenderer.send("main-window-show");
                });

                await launcher.launch(opts);
            } catch (err) {
                console.error(err);
                if (ui.modal.isConnected) ui.modal.remove();
                ShowCrashReport(err.message ?? String(err));
            } finally {
                ipcRenderer.send("main-window-progress-reset");
            }
        }

        async function LaunchClientVersion(account, client) {
            const pkg = require("../package.json");
            let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
            let ram = (await db.get("1234", "ram")).value;
            let Resolution = (await db.get("1234", "screen")).value;
            let launcherSettings = (await db.get("1234", "launcher"))
                .value;

            /* ────── UI helpers ────── */
            const $ = (sel, ctx = document) => ctx.querySelector(sel);
            const ui = await (async () => {
                const [downloadingClient, progress, calculatingTime, saveLogs, downloadingFiles] = await Promise.all([
                    window.getString("download.downloadingClient", "Descargando cliente"),
                    window.getString("download.progress", "Progreso"),
                    window.getString("download.calculatingTime", "calculando tiempo"),
                    window.getString("download.saveLogs", "Guardar logs"),
                    window.getString("download.downloadingFiles", "Descargando archivos")
                ]);

                const modal = document.createElement("div");
                modal.className = "modal is-active";
                modal.innerHTML = `
                <div class="modal-background"></div>
                <div class="modal-content download-modal-panel">
                  <div class="download-panel">
                    <div class="download-panel-left">
                      <div>
                        <h1>${downloadingClient}…</h1>
                        <p id="progressText" class="has-new-icons">
                          ${progress}: 0 % (${calculatingTime})
                        </p>
                        <progress id="progressBar" class="progress is-info" value="0" max="100"></progress>
                      </div>
                      <p class="small">
                        <span style="font-size:20px;font-weight:600;color:#fff">${window.stringLoader.getString("download.funFact")}</span><br>
                        ${getRandomFunFact()}
                      </p>
                    </div>
                    <div class="download-panel-right">
                      <span style="font-size:20px;font-weight:600;color:#fff">${window.stringLoader.getString("download.logs")}</span>
                      <textarea id="logArea" class="textarea has-fixed-size"
                                style="height:200px;font-family:Poppins, Noto Color Emoji;font-size:13px;background:#212121;overflow:hidden"
                                disabled></textarea>
                      <button id="saveLogs" class="button is-info is-small is-fullwidth"
                              style="border-radius:10px;margin-top:10px;font-family:Poppins;font-weight:500">
                        ${saveLogs}
                      </button>
                    </div>
                  </div>
                </div>`;
                document.body.appendChild(modal);
                return {
                    modal,
                    progressText: $("#progressText", modal),
                    progressBar: ($("#progressBar", modal)),
                    logArea: ($("#logArea", modal)),
                    log(msg, emoji = "🔄") {
                        this.logArea.value += `${emoji} ${msg}\n`;
                        this.logArea.scrollTop = this.logArea.scrollHeight;
                    },
                    setPct(p) {
                        this.progressBar.value = p;
                        this.progressText.textContent = `🔄 ${downloadingFiles}… ${p}%`;
                    }
                };
            })();

            if (!selectedVersion?.version) return;
            ipcRenderer.send("main-window-progress-loading");

            try {
                /* ─── Load all needed strings ─── */
                const [
                    versionJavaError, downloading, errorDownloading, downloadedSuccessfully,
                    extracting, filesExtractedSuccessfully, tempFilesDeletedSuccessfully,
                    downloadingAssets, errorDetectedOne, minecraftStartedCorrectly,
                    minecraftStartedCorrectlyBody, inTheMenu
                ] = await Promise.all([
                    window.getString("game.versionJavaError", "Para jugarlas, descarga la 1.20.1 de vanilla"),
                    window.getString("download.downloading", "Descargando"),
                    window.getString("download.errorDownloading", "Error al descargar"),
                    window.getString("download.downloadedSuccessfully", "descargado correctamente"),
                    window.getString("download.extracting", "Extrayendo"),
                    window.getString("download.filesExtractedSuccessfully", "Archivos extraídos correctamente"),
                    window.getString("download.tempFilesDeletedSuccessfully", "Archivos temporales eliminados correctamente"),
                    window.getString("download.downloadingAssets", "Descargando assets"),
                    window.getString("download.errorDetectedOne", "Error detectado"),
                    window.getString("game.minecraftStartedCorrectly", "Minecraft iniciado correctamente"),
                    window.getString("game.minecraftStartedCorrectlyBody", "Minecraft se ha iniciado correctamente."),
                    window.getString("home.inTheMenu", "en el menú")
                ]);

                /* ─── 1 · Comprobar/registrar JRE ─── */
                const javaCandidates = [
                    "jre-17.0.8-win32",
                    "jre-17.0.1.12.1-win32",
                    "jre-17.0.8-windows-x64",
                    "jre-17.0.1.12.1-windows-x64",
                ].map(p => path.join(dataDirectory, ".battly", "runtime", p, "bin", "java.exe"))
                    .filter(existsSync);

                if (!javaCandidates.length) {
                    // En lugar de lanzar un error, intentar descargar Java automáticamente
                    ui.log(`☕ ${downloading} Java...`);
                    ui.setPct(5);

                    try {
                        // Importar la función de descarga de Java
                        const downloadJavaVersion = require('./assets/js/utils/download-java.js');

                        // Usar Java 17 por defecto para clientes
                        const javaMajorVersion = "17";
                        const javaBasePath = path.join(dataDirectory, ".battly");

                        // Descargar Java con progreso
                        const javaPath = await downloadJavaVersion(javaMajorVersion, {
                            basePath: javaBasePath,
                            imageType: "jre",
                            intelEnabledMac: false,
                            onProgress: (progress) => {
                                if (progress.phase === 'download') {
                                    const percent = progress.percent ? progress.percent.toFixed(1) : 'unknown';
                                    if (percent !== 'unknown') {
                                        ui.log(`☕ ${downloading} Java ${javaMajorVersion}... ${percent}%`);
                                        ui.setPct(5 + (progress.percent * 0.2)); // Usar 20% del progreso total para Java
                                    }
                                } else if (progress.phase === 'extract') {
                                    ui.log(`🔧 Instalando Java ${javaMajorVersion}...`);
                                }
                            }
                        });

                        ui.log(`✅ Java ${javaMajorVersion} instalado correctamente`, "✅");
                        ui.setPct(25);

                        console.log("Java para cliente instalado en:", javaPath);

                        // Después de la descarga exitosa, el javaPath ya debería ser válido
                        if (javaPath && existsSync(javaPath)) {
                            javaCandidates.push(javaPath);
                            console.log("Java agregado a candidatos:", javaPath);
                        } else {
                            // Buscar cualquier instalación de Java 17 en runtime
                            console.log("Buscando instalaciones de Java 17 en runtime...");
                            const runtimeDir = path.join(dataDirectory, ".battly", "runtime");
                            if (fs.existsSync(runtimeDir)) {
                                console.log("Explorando directorio runtime para cliente:", runtimeDir);
                                const allFolders = fs.readdirSync(runtimeDir);
                                console.log("Carpetas encontradas para cliente:", allFolders);

                                const java17Folders = allFolders.filter(f =>
                                    f.includes("jre-17") ||
                                    f.includes("java-17") ||
                                    f.includes("jdk-17") ||
                                    f.includes("runtime-17")
                                );

                                console.log("Carpetas Java 17 encontradas:", java17Folders);

                                for (const folder of java17Folders) {
                                    const javaExe = process.platform === "win32" ? "java.exe" : "java";
                                    const testPath = path.join(runtimeDir, folder, "bin", javaExe);
                                    console.log("Probando ruta Java para cliente:", testPath);

                                    if (existsSync(testPath)) {
                                        javaCandidates.push(testPath);
                                        console.log("Java para cliente encontrado y agregado:", testPath);
                                        break;
                                    }
                                }
                            }
                        }

                    } catch (javaDownloadError) {
                        console.error("Error descargando Java:", javaDownloadError);
                        ui.modal.remove();
                        throw new Error(versionJavaError + " Error: " + javaDownloadError.message);
                    }

                    // Si aún no hay candidatos, lanzar el error original
                    if (!javaCandidates.length) {
                        ui.modal.remove();
                        throw new Error(versionJavaError);
                    }
                }

                await setValue("java-path", javaCandidates[0]);
                $("#ruta-java-input").value = javaCandidates[0];

                /* ─── 2 · Descargar ZIP ─── */
                const tmpDir = path.join(dataDirectory, ".battly", "temp");
                const zipPath = path.join(tmpDir, `${client.folderName}.zip`);
                await fsPromises.mkdir(tmpDir, { recursive: true });

                ui.log(`${downloading} ${client.folderName}…`);

                await new Promise((resolve, reject) => {
                    https.get(client.downlaodUrl, { headers: { "User-Agent": "BattlyLauncher" } }, res => {
                        if (res.statusCode !== 200) {
                            return reject(new Error(`${errorDownloading} (${res.statusCode})`));
                        }
                        const total = +res.headers["content-length"] || 0;
                        let bytes = 0;

                        const counter = new Transform({
                            transform(chunk, enc, cb) {
                                bytes += chunk.length;
                                if (total) ui.setPct(Math.round((bytes / total) * 100));
                                cb(null, chunk);
                            }
                        });

                        pipeline(res, counter, createWriteStream(zipPath))
                            .then(resolve)
                            .catch(reject);
                    }).on("error", reject);
                });

                ui.log(`${client.folderName} ${downloadedSuccessfully}`, "✅");

                /* ─── 3 · Extraer ─── */
                let zip = new AdmZip(zipPath);
                const entries = zip.getEntries();
                ui.progressBar.max = entries.length;

                entries.forEach((e, i) => {
                    ui.log(`${extracting} ${e.entryName}`);
                    zip.extractEntryTo(e, path.join(dataDirectory, ".battly"), true, true);
                    ui.progressBar.value = i + 1;
                });
                ui.log(filesExtractedSuccessfully, "✅");

                /* ─── 4 · Limpiar TMP ─── */
                zip = null;                         // libera handle sobre el ZIP
                await fsPromises.unlink(zipPath).catch(() => { });
                await fsPromises.rm(tmpDir, { recursive: true, force: true })
                    .catch(err => {
                        console.warn("No se pudo borrar /temp:", err.message);
                        ui.log("⚠️  No se pudo borrar la carpeta temporal (se liberará al reiniciar).");
                    });
                ui.log(tempFilesDeletedSuccessfully, "✅");

                /* ─── 5 · Preparar lanzamiento ─── */
                const verPath = path.join(
                    dataDirectory, ".battly", "versions",
                    client.folderName, `${client.folderName}.json`
                );
                const verJson = JSON.parse(await fsPromises.readFile(verPath, "utf8"));
                const inherit = verJson.assets ?? verJson.inheritsFrom ?? client.version;
                const javaPath = await getValue("java-path");

                const opts = {
                    url: battlyConfig.game_url || `${require("../package.json").url}/files`,
                    root: path.join(dataDirectory, ".battly"),
                    path: path.join(dataDirectory, ".battly"),
                    overrides: { detached: false, screen },
                    downloadFileMultiple: 40,
                    version: { custom: client.folderName, number: inherit, type: "release" },
                    verify: false,
                    ignored: ["loader"],
                    memory: { min: `${ram.ramMin * 1024}M`, max: `${ram.ramMax * 1024}M` },
                    authorization: account, authenticator: account,
                    detached: false, timeout: 10_000,
                    java: Boolean(javaPath), javaPath,
                    customArgs: [
                        "-javaagent:authlib-injector.jar=https://api.battlylauncher.com",
                        "-Dauthlibinjector.mojangAntiFeatures=enabled",
                        "-Dauthlibinjector.noShowServerName",
                        "-Dauthlibinjector.disableHttpd",
                    ],
                };

                /* ─── 6 · Lanzar ─── */
                const launcher = new Client();

                launcher.on("progress", p => ui.setPct(((p.task / p.total) * 100) | 0));
                launcher.on("debug", m => {
                    if (/Attempting to download assets/.test(m))
                        ui.progressText.textContent = `🔄 ${downloadingAssets}…`;
                    if (/Failed to start|Exception in thread|ClassCastException|has crashed|Unable to launch/.test(m))
                        ShowCrashReport(`${errorDetectedOne}\n${m}`);
                });
                launcher.on("data", d => {
                    if (/Setting user|Launching wrapped minecraft/.test(d) && ui.modal.isConnected) {
                        ui.modal.remove();
                        ipcRenderer.send("new-notification", {
                            title: minecraftStartedCorrectly,
                            body: minecraftStartedCorrectlyBody,
                        });
                        if (launcherSettings.launcher.close === "close-launcher")
                            ipcRenderer.send("main-window-hide");
                        ipcRenderer.send("main-window-progress-reset");
                    }
                });
                launcher.on("close", () => {
                    ipcRenderer.send("updateStatus", {
                        status: "online", details: inTheMenu, username: account.name,
                    });
                    if (ui.modal.isConnected) ui.modal.remove();
                    if (launcherSettings.launcher.close === "close-launcher")
                        ipcRenderer.send("main-window-show");
                });

                await launcher.launch(opts);
            } catch (err) {
                console.error(err);
                ShowCrashReport(err.message ?? String(err));
            } finally {
                ipcRenderer.send("main-window-progress-reset");
            }
        }
    }

}

export { Download };
