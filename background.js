// 初始化存儲
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ isLogEnabled: true });
    chrome.storage.local.set({ adCounts: {} });
    console.log('YT Ads Slayer 已安裝，初始化設定完成。');
});

// 監聽來自內容腳本的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 增加保護，確保 sender.tab.id 存在
    if (message.type === 'AD_BLOCKED' && sender.tab && sender.tab.id) {
        const tabId = sender.tab.id;
        chrome.storage.local.get(['adCounts'], (result) => {
            const adCounts = result.adCounts || {};
            const newCount = (adCounts[tabId] || 0) + 1;
            adCounts[tabId] = newCount;

            chrome.storage.local.set({ adCounts: adCounts }, () => {
                updateBadge(tabId, newCount);
            });
        });
    }
});

// 當分頁被關閉時，清除該分頁的計數
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get(['adCounts'], (result) => {
        const adCounts = result.adCounts || {};
        if (adCounts[tabId]) {
            delete adCounts[tabId];
            chrome.storage.local.set({ adCounts: adCounts });
        }
    });
});

// 當分頁更新或切換時，更新徽章
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 僅在分頁載入完成且為當前活動分頁時更新
    if (changeInfo.status === 'complete' && tab.active) {
        updateCountForTab(tabId);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    updateCountForTab(activeInfo.tabId);
});

function updateCountForTab(tabId) {
    if (!tabId) return;
    chrome.storage.local.get(['adCounts'], (result) => {
        const adCounts = result.adCounts || {};
        const count = adCounts[tabId] || 0;
        updateBadge(tabId, count);
    });
}


// 更新徽章的函數
function updateBadge(tabId, count) {
    const text = count > 0 ? count.toString() : '';
    // 使用 .catch() 來捕獲當分頁不存在時產生的錯誤，防止擴充套件崩潰
    chrome.action.setBadgeText({ tabId: tabId, text: text }).catch((error) => { /* console.log(error) */ });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#ff4d4d' }).catch((error) => { /* console.log(error) */ });
}
