import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const syncStorage = new Storage({ area: "sync" })

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "takeFullScreenshot") {
    const tabId = message.tabId
    chrome.debugger.attach({ tabId }, "1.3", () => {
      chrome.debugger.sendCommand(
        { tabId },
        "Page.getLayoutMetrics",
        {},
        (metrics: any) => {
          const width = Math.ceil(metrics.contentSize.width)
          const height = Math.ceil(metrics.contentSize.height)

          chrome.debugger.sendCommand(
            { tabId },
            "Emulation.setDeviceMetricsOverride",
            {
              mobile: false,
              width: width,
              height: height,
              deviceScaleFactor: 1
            },
            () => {
              // Wait slightly for DOM to adjust
              setTimeout(() => {
                chrome.debugger.sendCommand(
                  { tabId },
                  "Page.captureScreenshot",
                  {
                    format: "jpeg",
                    captureBeyondViewport: true
                  },
                  (result: any) => {
                    chrome.debugger.detach({ tabId })
                    sendResponse({ data: result.data })
                  }
                )
              }, 500)
            }
          )
        }
      )
    })
    return true // async response
  }
  
  if (message.action === "takeVisibleScreenshot") {
    chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: "jpeg" }, (dataUrl) => {
      sendResponse({ data: dataUrl })
    })
    return true
  }

  if (message.action === "downloadScreenshot") {
    downloadImage(message.dataUrl)
  }
})

async function downloadImage(dataUrl: string) {
  const useSync = await storage.get("useSyncSettings")
  const activeStorage = useSync ? syncStorage : storage
  const captureDir = (await activeStorage.get("captureDir")) || "Captures"
  
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  const filename = `screenshot_${yyyy}${mm}${dd}_${hh}${mi}${ss}.jpg`
  
  const path = `${captureDir}/${filename}`

  chrome.downloads.download({
    url: dataUrl.startsWith("data:") ? dataUrl : `data:image/jpeg;base64,${dataUrl}`,
    filename: path,
    saveAs: false
  })
}
