const { app, BrowserWindow, shell } = require("electron");

var mainWindow = null;

function createWindow() {
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        //icon: app.getAppPath() + "/src/icons/icon.ico",
        title: "Node.js Simulations",
        autoHideMenuBar: true,
        fullscreenable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: app.getAppPath() + "/src/js/preload.js",
        }
    });

    window.maximize();
    window.loadFile(app.getAppPath() + "/src/html/index.html");

    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);

        return { action: "deny" };
    });

    return window;
};

app.on("ready", () => {
    mainWindow = createWindow();
});

app.on("activate", () => {
    if (mainWindow === null) {
        mainWindow = createWindow();
    };
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    };
});