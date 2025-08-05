// 專為 YouTube 設計的輕量級廣告攔截腳本

// 檢查當前頁面是否為 YouTube
if (window.location.hostname.includes('youtube.com')) {

// --- 開始：新增用於與 background 和 popup 互動的程式碼 ---

/**
 * 向背景腳本 (background.js) 發送訊息，通知一個廣告已被攔截。
 */
const reportAdBlocked = () => {
  // 檢查 chrome.runtime 是否可用，以避免在非擴充套件環境中執行時出錯
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'AD_BLOCKED' });
  }
};

/**
 * 監聽來自彈出視窗 (popup.js) 的訊息，以控制日誌視窗的顯示或隱藏。
 */
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_LOG') {
        const logWindow = document.getElementById('ad-slayer-log-window');
        if (logWindow) {
          // 根據收到的 isLogEnabled 狀態來決定顯示或隱藏
          logWindow.style.display = message.isLogEnabled ? 'block' : 'none';
        } else if (message.isLogEnabled) {
          // 如果日誌從關閉變為開啟，且視窗不存在，則創建它
          createNotificationWindow();
        }
      }
    });
}


/**
 * 頁面載入時，從存儲中讀取日誌開關的初始狀態。
 */
if (chrome.storage && chrome.storage.sync) {
    // 【關鍵修正】我將創建視窗的邏輯移到這裡
    // 先讀取設定，再決定是否要執行 createNotificationWindow
    chrome.storage.sync.get(['isLogEnabled'], (result) => {
        if (result.isLogEnabled) {
            // 只有在日誌記錄為開啟時，才創建視窗
            // 這段程式碼是從你原本的檔案末端移動過來的，邏輯完全相同
            if (document.body) {
                createNotificationWindow();
            } else {
                document.addEventListener('DOMContentLoaded', createNotificationWindow);
            }
        }
    });
}


// --- 結束：新增的程式碼 ---

  /**
   * 創建並插入一個用於顯示日誌的懸浮視窗。
   * 這個視窗會固定在頁面右下角，用於顯示被攔截的廣告元素資訊。
   * --- MODIFIED: 此函數的樣式已更新 ---
   */
  const createNotificationWindow = () => {
    // 如果視窗已存在，則不執行任何操作
    if (document.getElementById('ad-slayer-log-window')) {
      return;
    }

    const logWindow = document.createElement('div');
    logWindow.id = 'ad-slayer-log-window';
    
    // === 更新後的樣式 ===
    // 使用 Object.assign 來整合所有樣式，並加入毛玻璃效果
    Object.assign(logWindow.style, {
      position: 'fixed',
      bottom: '15px',
      right: '15px',
      width: '420px',
      maxHeight: '45vh', // 使用最大高度以適應不同內容長度
      backgroundColor: 'rgba(20, 20, 20, 0.75)', // 稍微調高透明度以突顯毛玻璃效果
      color: '#FFFFFF', // 將主要文字顏色改為白色
      border: '1px solid #444', // 使用較柔和的邊框顏色
      borderRadius: '8px',
      padding: '10px',
      fontFamily: 'monospace',
      fontSize: '12px',
      overflowY: 'auto', // 當內容溢出時自動顯示滾動條
      zIndex: '999999',
      boxSizing: 'border-box',
      // 毛玻璃效果
      backdropFilter: 'blur(10px)',
      webkitBackdropFilter: 'blur(10px)', // 針對 Safari 等瀏覽器的相容性
    });

    const header = document.createElement('div');
    header.textContent = 'YT Ads Slayer - 攔截紀錄';
    // 更新 header 的樣式以匹配新設計
    Object.assign(header.style, {
        fontWeight: 'bold',
        borderBottom: '1px solid #444', // 匹配新的邊框顏色
        paddingBottom: '5px',
        marginBottom: '5px',
        color: '#FFFFFF', // Header 文字也是白色
    });

    logWindow.appendChild(header);

    // --- 【新增】從 sessionStorage 載入並顯示歷史紀錄 ---
    try {
        const key = 'yt-ads-slayer-logs';
        const logs = JSON.parse(sessionStorage.getItem(key)) || [];
        logs.forEach(msg => {
            const logEntry = document.createElement('div');
            logEntry.textContent = msg;
            Object.assign(logEntry.style, {
                padding: '2px 0',
                borderBottom: '1px solid #333'
            });
            logWindow.appendChild(logEntry);
        });
    } catch (e) {
        // 忽略 sessionStorage 的錯誤
    }
    // --- 【結束】新增部分 ---

    document.body.appendChild(logWindow);
  };

  /**
   * 將訊息添加到懸浮日誌視窗中。
   * @param {string} message - 要記錄的訊息。
   */
  const logToWindow = (message) => {
    // --- 【新增】將日誌保存到 sessionStorage 以便刷新後讀取 ---
    try {
        const key = 'yt-ads-slayer-logs';
        let logs = JSON.parse(sessionStorage.getItem(key)) || [];
        logs.unshift(message); // 將新訊息加到陣列最前面
        // 為避免佔用過多記憶體，只保留最新的 100 條紀錄
        if (logs.length > 100) {
            logs.length = 100;
        }
        sessionStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
        // 忽略 sessionStorage 可能發生的錯誤 (例如空間已滿)
    }
    // --- 【結束】新增部分 ---

    const logWindow = document.getElementById('ad-slayer-log-window');
    // 如果視窗不存在（可能在 body 載入完成前被呼叫），則不執行
    if (!logWindow) {
      return;
    }
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    
    // 為了美觀，可以為每條日誌加上一點間距
    Object.assign(logEntry.style, {
        padding: '2px 0',
        borderBottom: '1px solid #333' // 在每條日誌間加上細微分隔線
    });

    // 將新日誌添加到標題下方，列表的頂部
    const header = logWindow.querySelector('div');
    if (header && header.nextSibling) {
        logWindow.insertBefore(logEntry, header.nextSibling);
    } else {
        logWindow.appendChild(logEntry);
    }
  };


  /**
   * 處理並移除 YouTube 觀看頁面 (watch page) 上的影片內廣告。
   * - 加速影片廣告。
   * - 自動點擊「略過廣告」按鈕。
   */
  const handleWatchPageAds = () => {
    // 1. 加速影片播放器中的廣告
    const adVideo = document.querySelector('.ad-showing .html5-main-video');
    if (adVideo) {
      adVideo.muted = true;
      adVideo.currentTime = adVideo.duration || 9999;
    }

    // 2. 自動點擊各種「略過廣告」按鈕
    const skipButtons = [
			'[id^="skip-button"]',
			'ytp-skip-ad-button'
    ];
    document.querySelectorAll(skipButtons.join(', ')).forEach(button => {
      if (button && typeof button.click === 'function') {
        button.click();

      }
    });
  };

  /**
   * --- NEW: 新增的播放重試函數 ---
   * 確保影片播放，在指定時間內重試直到成功或超時。
   * @param {HTMLVideoElement} videoElement - 要播放的影片元素。
   */
  const ensurePlayback = (videoElement) => {
    if (!videoElement || !videoElement.paused) {
        return; // 如果影片不存在或已在播放，則不執行
    }
    
    logToWindow(`偵測到播放可能已暫停，嘗試恢復播放...`);
    let attempts = 0;
    const maxAttempts = 20; // 最多嘗試20次 (20 * 100ms = 2秒)
    const interval = setInterval(() => {
        // 如果影片已開始播放或嘗試次數超限，則停止重試
        if (!videoElement.paused || attempts >= maxAttempts) {
            if (!videoElement.paused) {
                logToWindow(`影片已成功恢復播放！`);
            } else {
                logToWindow(`恢復播放超時。`);
            }
            clearInterval(interval);
            return;
        }
        
        // 嘗試播放影片
        videoElement.play();
        attempts++;
    }, 100); // 每 100 毫秒嘗試一次
  };
	
  /**
   * 處理並移除 YouTube 所有頁面 (包含首頁、搜尋頁) 上的靜態廣告版位。
   * - 尋找並隱藏廣告的「整個容器」，以徹底消除空白區域。
   * - 每當隱藏一個元素時，在懸浮視窗中記錄下來。
   */
  const handleGeneralAds = () => {
    const adSelectors = [
      "ytd-player-legacy-desktop-watch-ads-renderer", // 播放
	  
	  
      "ytd-ad-inline-playback-meta-block", //主頁 置頂廣告
      'ytd-ad-slot-renderer',// 主頁 主要圖片縮圖廣告
	  "ytd-in-feed-ad-layout-renderer", // 主頁 動態消息中的廣告版面配置 (In-feed Ad Layout)
      "ytd-video-masthead-ad-v3-renderer", //主頁? 影片上方的橫幅廣告 (Masthead Ad)
	  
      'ytd-ad-inline-playback-renderer',//主頁 

      "ytd-display-ad-renderer", // 顯示廣告 (Display Ad)
      "ytd-promoted-sparkles-web-renderer", // 首頁
      "ytd-compact-promoted-video-renderer", // 緊湊型的推廣影片 (Compact Promoted Video)
      "ytd-action-companion-ad-renderer", // 影片旁的行動呼籲廣告 (Action Companion Ad)
      "ytd-action-engagement-panel-content-renderer", // 參與面板中的行動呼籲廣告內容 (Action Engagement Panel Content)
      "ytd-banner-promo-renderer", // 橫幅推廣 (Banner Promo)

	  
      "ytd-engagement-panel-title-header-renderer", //播放 主要廣告 參與面板中的標題廣告 (Engagement Panel Ad)
      "ytd-ads-engagement-panel-content-renderer", // 播放 主要廣告 參與面板中的廣告內容 (Ads Engagement Panel Content)
	  'tp-yt-iron-overlay-backdrop', //播放
      'panel-ad-header-image-lockup-view-model', //播放
	  "yt-mealbar-promo-renderer", //播放 Premium 家庭方案等彈出式廣告
	  
	  
      'ytd-enforcement-message-view-model', //播放 反廣告攔截器的提示
	  //'.ytp-ad-module', //禁用會出現問題
	  '.video-ads', //主頁 播放 片尾圖片
    ];

       // 遍歷每一個廣告選擇器
     adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(adElement => {
        
        let elementToHide;

        // --- NEW: Refined hiding logic ---
        // 對於參與面板的廣告，只隱藏廣告本身，而不是整個面板
        if (selector.includes('engagement-panel')) {
            elementToHide = adElement;
        } else {
            // 對於其他廣告，繼續使用尋找父層容器的策略以避免留下空白
            const container = adElement.closest(
              'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-ad-inline-playback-renderer, tp-yt-paper-dialog'
            );
            elementToHide = container || adElement;
        }

        // 檢查元素是否已經被處理過
        if (elementToHide.style.display === 'none' || elementToHide.style.opacity === '0') {
          return;
        }

        const time = new Date().toLocaleTimeString();
        let logMessage = '';

        // --- Conditional Hiding Logic (from previous solution) ---
		const visualHideSelectors = [
					'ytd-player-legacy-desktop-watch-ads-renderer',
                    'ytd-engagement-panel-title-header-renderer',
					'ytd-enforcement-message-view-model' 
		];

        if (visualHideSelectors.includes(selector)) {
                    Object.assign(elementToHide.style, {
                        opacity: '0',
                        height: '0',
                        width: '0',
                        position: 'absolute',
                        zIndex: '-1',
                        pointerEvents: 'none'

          });
          elementToHide.style.removeProperty('display');
          logMessage = `(${time}) 找到 ${selector}，已使用「視覺隱藏」模式。`;
        } else {
          elementToHide.style.setProperty('display', 'none', 'important');
          const elementIdentifier = elementToHide.tagName.toLowerCase() + (elementToHide.id ? `#${elementToHide.id}` : '');
          logMessage = `(${time}) 找到 ${selector}，已遮蔽 ${elementIdentifier}`;
        }
        
        logToWindow(logMessage);
        reportAdBlocked();
		  
        // --- Playback Fix Logic (Keep as is) ---
                const playbackFixSelectors = [
                    'ytd-player-legacy-desktop-watch-ads-renderer',
                    'tp-yt-iron-overlay-backdrop'
                ];
				
                if (playbackFixSelectors.includes(selector)) {
                    const mainVideo = document.querySelector('video.html5-main-video');
                    ensurePlayback(mainVideo);
                }
      });
    });
  };

  /**
   * --- 全新功能：處理反廣告攔截器的黑畫面問題 ---
   * 偵測到 "error-screen" 出現時，依使用者要求重新整理頁面。
   */
  const handleAdBlockerScreen = () => {
    const errorScreen = document.querySelector('yt-playability-error-supported-renderers#error-screen');

    // 檢查錯誤畫面是否存在且可見 (offsetParent !== null 是檢查元素是否在畫面上顯示的好方法)
    if (errorScreen && errorScreen.offsetParent !== null) {
      
      // 檢查是否已在重整過程中，避免無限循環
      if (!window.isReloadingForAdBlock) {
        window.isReloadingForAdBlock = true; // 設定一個標記
        logToWindow(`偵測到反廣告攔截畫面，正在重新整理頁面...`);
        // 執行重整
        window.location.reload();
      }
    }
  };


  //根據當前頁面路徑，決定執行哪個廣告處理函數
  const runAdChecks = () => {
    handleGeneralAds(); // 對所有頁面都有效
    handleAdBlockerScreen(); // 【新】檢查反廣告攔截畫面
    if (window.location.pathname === '/watch') { // 只在影片觀看頁面執行
      handleWatchPageAds();
    }
  };

  // 頁面初次載入時，立即執行一次檢查
  // runAdChecks(); // MutationObserver 會在 DOM 載入後觸發，此處可選

  // 【關鍵修正】我已經將創建視窗的邏輯移動到檔案上方讀取設定的地方
  // 所以你原本在檔案末端的這段程式碼就不再需要了
  /*
  // 確保懸浮視窗在 DOM 準備好後被創建
  if (document.body) {
    createNotificationWindow();
  } else {
    document.addEventListener('DOMContentLoaded', createNotificationWindow);
  }
  */

  // 使用 MutationObserver 來監控頁面的動態變化，確保新載入的廣告也能被處理
  const observer = new MutationObserver(runAdChecks);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

}
