import {
  AJAX_INTERCEPTOR_PROJECTS,
  AJAX_INTERCEPTOR_CURRENT_PROJECT,
} from '@/store'

let ftdWindow = null

chrome.windows.onRemoved.addListener((windowId) => {
  if (ftdWindow && ftdWindow.id === windowId) {
    chrome.browserAction.setBadgeText({ text: '' })
    ftdWindow = null
  }
})

const defaultProject = {
  name: 'localhost',
  origin: 'http://127.0.0.1:5173',
  color: '#409EFF',
  switchOn: true,
  isRealRequest: false,
  isTerminalLogOpen: false,
}
const defaultProjectProduct = {
  name: '默认地址',
  origin: 'http://127.0.0.1:3000',
  color: '#409EFF',
  switchOn: true,
  isRealRequest: false,
  isTerminalLogOpen: false,
}

chrome.runtime.onInstalled.addListener(function () {
  console.log('当前环境变量NODE_ENV => ', process.env.NODE_ENV)
  // 区分开发环境还是生产环境
  if (process.env.NODE_ENV === 'development') {
    chrome.storage.local.set(
      {
        [AJAX_INTERCEPTOR_PROJECTS]: [defaultProject],
        [AJAX_INTERCEPTOR_CURRENT_PROJECT]: defaultProject.name,
      },
      function () {
        console.log('开发环境')
      }
    )
  } else {
    chrome.storage.local.set(
      {
        [AJAX_INTERCEPTOR_PROJECTS]: [defaultProjectProduct],
        [AJAX_INTERCEPTOR_CURRENT_PROJECT]: defaultProjectProduct.name,
      },
      function () {
        console.log('生产环境')
      }
    )
  }
})

chrome.browserAction.onClicked.addListener(function () {
  if (ftdWindow) {
    console.log('The window exists!')
    const info = {
      focused: true,
    }
    chrome.windows.update(ftdWindow.id, info, (w) => {
      if (!w) {
        ftdWindow = null
      }
    })
  } else {
    chrome.storage.local.get(['windowSize'], function (result) {
      console.log(`storage.sync`)
      let width = 1000
      let height = 700
      if (result.windowSize) {
        width = parseInt(result.windowSize.width)
        height = parseInt(result.windowSize.height)
      }
      const left = parseInt((window.screen.width - width) / 2)
      const top = parseInt((window.screen.height - height) / 2)

      chrome.windows.create(
        {
          url: chrome.runtime.getURL('webContent.html'),
          type: 'popup',
          left,
          top,
          width,
          height,
        },
        function (window) {
          ftdWindow = window
        }
      )
    })
  }
})
var notifications = [];

function createNotification(message) {
  var notificationOptions = {
    type: 'list',
    title: '',
    message: message,
    iconUrl: chrome.runtime.getURL("assets/icons_1/logo.png"),
    items: []
  };

  // Add notification to the list
  notifications.push(notificationOptions);

  // Display notifications in order from top to bottom
  for (var i = 0; i < notifications.length; i++) {
    notificationOptions.items.push({ title: notifications[i].title, message: notifications[i].message });
  }

  // Set timer to remove oldest notification after 3 seconds
  if (notifications.length > 1) {
    setTimeout(function () {
      notifications.shift();
      chrome.notifications.clear(notifications[0].notificationId);
    }, 3000);
  }
  if (notifications.length === 1) {
    setTimeout(function () {
      // notifications.shift();
      chrome.notifications.clear(notifications[0].notificationId);
    }, 3000);
    return;
  }

  // Create the notification
  chrome.notifications.create('', notificationOptions, function (notificationId) {
    notificationOptions.notificationId = notificationId;
  });
}

chrome.runtime.onMessage.addListener(event => {
  console.log('event',event)
  if (event.type === 'ajaxInterceptor') {
    const url = event.detail.request.url
    if (event.detail.isMock) {
      const path = url.match(/\/\/[^\/:]+(:\d+)?(\/[^?#]*)/)[2];
      createNotification('拦截了请求\n' + path)
    }
  }
})


