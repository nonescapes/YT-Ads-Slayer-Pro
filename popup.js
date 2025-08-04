document.addEventListener('DOMContentLoaded', () => {
    const adCountElement = document.getElementById('ad-count');
    const logToggle = document.getElementById('log-toggle');

    // 獲取當前分頁的廣告攔截計數
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTabId = tabs[0].id;
        if (currentTabId) {
            chrome.action.getBadgeText({ tabId: currentTabId }, (text) => {
                adCountElement.textContent = text || '0';
            });
        }
    });

    // 從存儲中讀取日誌開關的狀態並設定
    chrome.storage.sync.get(['isLogEnabled'], (result) => {
        logToggle.checked = !!result.isLogEnabled;
    });

    // 監聽開關的變化
    logToggle.addEventListener('change', () => {
        const isEnabled = logToggle.checked;
        // 將新狀態保存到存儲
        chrome.storage.sync.set({ isLogEnabled: isEnabled });

        // 通知當前分頁的內容腳本更新日誌視窗的顯示狀態
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_LOG',
                    isLogEnabled: isEnabled
                });
            }
        });
    });
});
