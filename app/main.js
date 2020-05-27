'use strict';

// Setup debug log
const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = false;
log.info('Start app.');

// Setup Electron
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
let mainWindow;
const Menu = electron.Menu;
const {crashReporter, dialog} = require('electron');
const ipcMain = electron.ipcMain;
app.allowRendererProcessReuse = true;

// load Graph API access token
const {AccessInfo, validateAccessInfo, generatePermanentToken} = require('./lib/token_operator');
const AppSetting = require('./lib/default_setting');
let setting;

const process = require('process');
const path = require('path');
const setting_path = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../token/appsetting.json')
      : path.join(process.resourcesPath, 'appsetting.json');
log.info('Setting : ' + setting_path);
try{
    const setting_json = require(setting_path);
    setting = new AppSetting(setting_json.post_num, setting_json.top_thre,
                             setting_json.igID, setting_json.token);
    log.info('Load setting from appsetting.json : ' + JSON.stringify(setting));
} catch(err) {
    log.error(err);
    setting = new AppSetting();
    log.info('Load default setting : ' + JSON.stringify(setting));
}

// load analyzer logic-class
const TagAnalyzer = require('./lib/tag_analyzer');
let analyzer;

process.on('uncaughtException', function(err) {
  log.error('Electron:event:uncaughtException');
  log.error(err);
  log.error(err.stack);
  app.quit();
});

// TODO : set valid-setting
crashReporter.start({
  productName: 'ig_h_a',
  companyName: '',
  submitURL: 'url": "https://github.com/mizmizo/ig_hashtag_analyzer/issues',
  autoSubmit: true
});

app.on('window-all-closed', function() {
    log.info('Quit App by window-all-closed.');
    app.quit();
});

app.on('ready', function() {
    Menu.setApplicationMenu(menu);
    openWindow('index');
});

function openWindow (page) {
    log.info('OpenWindow : ' + page);
    mainWindow = new BrowserWindow({
        width: 1180,
        height: 960,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    reloadURL(page);

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
};

function reloadURL (page) {
    log.info('reloadURL : ' + page);
    mainWindow.loadURL('file://' + __dirname + '/' + page + '.html');
}

// メニュー情報の作成
const template = [
    {
        label: 'Quit',
        submenu: [
            {label: 'Quit',
             accelerator: 'Command+Q',
             click: function () {
                 log.info('Quit App by Quit menu.');
                 app.quit();
             }}
        ]
    }, {
        label: 'Operation',
        submenu: [
            {
                label: 'Load Posts',
                accelerator: 'Command+O',
                click: function () {
                }
            }
        ]
    }, {
        label: 'View',
        submenu: [
            {label: 'Reload',
             accelerator: 'Command+R',
             click: function () {
                 BrowserWindow.getFocusedWindow().reload();
             }},
            {
                label: 'Toggle DevTools',
                accelerator: 'Alt+Command+I',
                click: function () {
                    BrowserWindow.getFocusedWindow().toggleDevTools();
                }
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(template);

// AppError handling
function logAndShowErr(err) {
    log.error(err);
    dialog.showErrorBox(err.name + ' : ' +  err.code, err.message);
}

// 分析処理CB
ipcMain.handle('requestPostData', () => {
    log.info('IPC CB : requestPostData');
    analyzer = new TagAnalyzer(setting, log);
    analyzer.requestPostData()
        .then(() => {
            reloadURL('select');
        })
        .catch((err) => {
            logAndShowErr(err);
            if(!err.sustainable){
                log.info('Quit App by Error.');
                app.quit();
            } else {
                reloadURL('index');
            }
        });
});

ipcMain.handle('getTagList', () => {
    log.info('IPC CB : getTagList');
    try{
        let list = analyzer.getAllTagList();
        return list;
    } catch (err) {
        logAndShowErr(err);
        if(!err.sustainable){
            log.info('Quit App by Error.');
            app.quit();
        } else {
            reloadURL('index');
        }
    }
});

ipcMain.handle('analyse', (event, tags) => {
    log.info('IPC CB : analyse');
    analyzer.analyse(tags)
        .then(() => {
            reloadURL('result');
        })
        .catch((err) => {
            logAndShowErr(err);
            if(!err.sustainable){
                log.info('Quit App by Error.');
                app.quit();
            } else {
                reloadURL('index');
            }
        });
});

ipcMain.handle('getGalleyData', () => {
    log.info('IPC CB : getGalleyData');
    try {
        let data = analyzer.getGalleyData();
        return data;
    } catch (err) {
        logAndShowErr(err);
        if(!err.sustainable){
            log.info('Quit App by Error.');
            app.quit();
        } else {
            reloadURL('index');
        }
    }
});

// 画面遷移CB
ipcMain.handle('cancel', () => {
    log.info('IPC CB : cancel');
    reloadURL('index');
});

ipcMain.handle('toHowto', () => {
    log.info('IPC CB : toHowto');
    reloadURL("howto")
});

ipcMain.handle('toExplain', () => {
    log.info('IPC CB : toExplain');
    reloadURL("explain")
});

// 分析設定CB
ipcMain.handle('getCurrentSetting', () => {
    log.info('IPC CB : getCurrentSetting');
    return setting;
});

// params = {first_token:, app_id:, app_secret:, pagename:}
ipcMain.handle('generatePermanentToken', (event, params) => {
    log.info('IPC CB : generatePermanentToken');
    // TODO : 永続トークンの取得,チェック
    return true; // 成功⇒true, 失敗⇒false
});

// params = {igID:, token:}
ipcMain.handle('registerAccessInfo', (event, params) => {
    log.info('IPC CB : registerAccessInfo');
    // TODO : 永続トークンの登録、チェック
    return true; // 成功⇒true, 失敗⇒false
});

// params = {post_num:, top_thre:}
ipcMain.handle('registerSetting', (event, params) => {
    log.info('IPC CB : registerSetting');
    // TODO :
    reloadURL('index');
});
