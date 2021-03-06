'use strict';

function apply() {
    window.log.info('call index.apply()');
    const loader = document.getElementById('loader');
    loader.classList.add('loading');
    window.ipcRenderer.invoke('requestPostData', 'req');
}

function click_howto() {
    window.log.info('call index.click_howto()');
    window.ipcRenderer.invoke('toHowto', '');
}

function click_explain() {
    window.log.info('call index.click_explain()');
    window.ipcRenderer.invoke('toExplain', '');
}