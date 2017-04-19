/* eslint-disable */
'use strict';

const path = require('path');
const {app, ipcMain} = require('electron');

const UpdateHandler = require('./handlers/update');
const Common = require('./common');
const AppConfig = require('./configuration');

const SplashWindow = require('./windows/controllers/splash');
const WeChatWindow = require('./windows/controllers/wechat');
const SettingsWindow = require('./windows/controllers/settings')
const AppTray = require('./windows/controllers/app_tray');
const socketclient = require('socket.io-client');
const socket = socketclient.connect('http://10.8.8.13:8002/hubot',{
    transports:['websocket']
})
socket.on('connect', function(){
    console.log('connected');
    socket.emit('cced','connected')
});
socket.on('event', function(data){
    console.log('event');
    socket.emit('cced',data)
});
socket.on('disconnect', function(){
    console.log('disconnect');
    socket.emit('cced','disconnect')
});

class ElectronicWeChat {
  constructor() {
    this.wechatWindow = null;
    this.splashWindow = null;
    this.settingsWindow = null;
    this.tray = null;
  }

  init() {
    this.initApp();
    this.initIPC();
  }

  initApp() {
    app.on('ready', ()=> {
      this.createSplashWindow();
      this.createWeChatWindow();
      this.createTray();

      if (!AppConfig.readSettings('language')) {
        AppConfig.saveSettings('language', 'en');
        AppConfig.saveSettings('prevent-recall', 'on');
        AppConfig.saveSettings('icon', 'black');
      }
    });

    app.on('activate', () => {
      if (this.wechatWindow == null) {
        this.createWeChatWindow();
      } else {
        this.wechatWindow.show();
      }
    });
  };

  initIPC() {
    ipcMain.on('badge-changed', (event, num) => {
      if (process.platform == "darwin") {
        app.dock.setBadge(num);
        if (num) {
          this.tray.setTitle(` ${num}`);
        } else {
          this.tray.setTitle('');
        }
      } else if (process.platform == "linux") {
          app.setBadgeCount(num * 1);
          this.tray.setUnreadStat((num * 1 > 0)? 1 : 0);
      }
    });

    ipcMain.on('user-logged', () => {
      this.wechatWindow.resizeWindow(true, this.splashWindow)
    });

    ipcMain.on('wx-rendered', (event, isLogged) => {
      this.wechatWindow.resizeWindow(isLogged, this.splashWindow)
    });

    ipcMain.on('log', (event, message) => {
      console.log(message);
    });

    ipcMain.on('reload', (event, repetitive) => {
      if (repetitive) {
        this.wechatWindow.loginState.current = this.wechatWindow.loginState.NULL;
        this.wechatWindow.connectWeChat();
      } else {
        this.wechatWindow.loadURL(Common.WEB_WECHAT);
      }
    });

    ipcMain.on('update', (event, message) => {
      let updateHandler = new UpdateHandler();
      updateHandler.checkForUpdate(`v${app.getVersion()}`, false);
    });

    ipcMain.on('open-settings-window', (event, message) => {
      if (this.settingsWindow) {
        this.settingsWindow.show();
      } else {
        this.createSettingsWindow();
        this.settingsWindow.show();
      }
    });

    ipcMain.on('close-settings-window', (event, messgae) => {
      this.settingsWindow.close();
      this.settingsWindow = null;
    })
  };

  createTray() {
    this.tray = new AppTray(this.splashWindow, this.wechatWindow);
  }

  createSplashWindow() {
    this.splashWindow = new SplashWindow();
    this.splashWindow.show();
  }

  createWeChatWindow() {
    this.wechatWindow = new WeChatWindow();
  }

  createSettingsWindow() {
    this.settingsWindow = new SettingsWindow();
  }

}

new ElectronicWeChat().init();
