import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"
import "./styles.css"

const storage = new Storage()
const syncStorage = new Storage({ area: "sync" })

type SizeMode = "window" | "viewport"
type Template = { name: string; width: number; height: number; mode: SizeMode }

const DEFAULT_TEMPLATES: Template[] = [
  { name: "Mobile (Portrait)", width: 375, height: 667, mode: "viewport" },
  { name: "Mobile (Landscape)", width: 667, height: 375, mode: "viewport" },
  { name: "Tablet", width: 768, height: 1024, mode: "viewport" },
  { name: "PC Standard", width: 1280, height: 720, mode: "window" },
  { name: "PC Large", width: 1920, height: 1080, mode: "window" }
]

function Popup() {
  const [currentWinSize, setCurrentWinSize] = useState({ w: 0, h: 0 })
  const [currentVpSize, setCurrentVpSize] = useState({ w: 0, h: 0 })
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [customName, setCustomName] = useState("")
  const [customW, setCustomW] = useState("")
  const [customH, setCustomH] = useState("")
  const [customMode, setCustomMode] = useState<SizeMode>("window")
  const [useSync, setUseSync] = useState(false)

  useEffect(() => {
    storage.get("useSyncSettings").then((val) => {
      setUseSync(!!val)
      const activeStorage = val ? syncStorage : storage
      activeStorage.get<Template[]>("customTemplates").then((res) => {
        if (res && res.length > 0) {
          setTemplates([...DEFAULT_TEMPLATES, ...res])
        } else {
          setTemplates(DEFAULT_TEMPLATES)
        }
      })
    })
    updateCurrentSize()
  }, [])

  const updateCurrentSize = () => {
    chrome.windows.getCurrent((win) => {
      setCurrentWinSize({ w: win.width || 0, h: win.height || 0 })
    })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => ({ w: window.innerWidth, h: window.innerHeight })
          },
          (results) => {
            if (results && results[0] && results[0].result) {
              setCurrentVpSize(results[0].result as {w: number, h: number})
            }
          }
        )
      }
    })
  }

  const applySize = async (t: Template) => {
    const win = await chrome.windows.getCurrent()
    const displays = await chrome.system.display.getInfo()
    const currentDisplay = displays.find(d => 
      win.left! >= d.bounds.left && win.left! <= d.bounds.left + d.bounds.width &&
      win.top! >= d.bounds.top && win.top! <= d.bounds.top + d.bounds.height
    ) || displays[0]

    let maxW = currentDisplay.workArea.width
    let maxH = currentDisplay.workArea.height
    let minW = 100
    let minH = 100

    let targetW = Math.max(minW, Math.min(t.width, maxW))
    let targetH = Math.max(minH, Math.min(t.height, maxH))

    if (t.mode === "window") {
      chrome.windows.update(win.id!, { width: targetW, height: targetH }, () => {
        setTimeout(updateCurrentSize, 500)
      })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              func: () => ({ outW: window.outerWidth, outH: window.outerHeight, inW: window.innerWidth, inH: window.innerHeight })
            },
            (results) => {
              if (results && results[0] && results[0].result) {
                const res = results[0].result as {outW:number, outH:number, inW:number, inH:number}
                const diffW = res.outW - res.inW
                const diffH = res.outH - res.inH
                let winW = targetW + diffW
                let winH = targetH + diffH
                winW = Math.max(minW, Math.min(winW, maxW))
                winH = Math.max(minH, Math.min(winH, maxH))
                chrome.windows.update(win.id!, { width: winW, height: winH }, () => {
                  setTimeout(updateCurrentSize, 500)
                })
              }
            }
          )
        }
      })
    }
  }

  const addCustomTemplate = async () => {
    const w = parseInt(customW)
    const h = parseInt(customH)
    if (!customName || isNaN(w) || isNaN(h)) return

    const newT: Template = { name: customName, width: w, height: h, mode: customMode }
    const activeStorage = useSync ? syncStorage : storage
    const currentCustom = templates.slice(DEFAULT_TEMPLATES.length)
    const newCustom = [...currentCustom, newT]
    
    setTemplates([...DEFAULT_TEMPLATES, ...newCustom])
    await activeStorage.set("customTemplates", newCustom)
    setCustomName("")
    setCustomW("")
    setCustomH("")
  }

  const deleteTemplate = async (index: number) => {
    if (index < DEFAULT_TEMPLATES.length) return
    const customIndex = index - DEFAULT_TEMPLATES.length
    const activeStorage = useSync ? syncStorage : storage
    
    const currentCustom = templates.slice(DEFAULT_TEMPLATES.length)
    const newCustom = currentCustom.filter((_, i) => i !== customIndex)
    
    setTemplates([...DEFAULT_TEMPLATES, ...newCustom])
    await activeStorage.set("customTemplates", newCustom)
  }

  const takeScreenshot = (action: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id
      chrome.runtime.sendMessage({ action, tabId }, (response) => {
        if (response && response.data) {
          chrome.runtime.sendMessage({ action: "downloadScreenshot", dataUrl: response.data })
        }
      })
    })
  }

  return (
    <div className="container" style={{ width: "320px" }}>
      <div className="section">
        <h3 className="section-title">Current Size</h3>
        <div style={{fontSize: "12px"}}>Window: {currentWinSize.w} x {currentWinSize.h}</div>
        <div style={{fontSize: "12px"}}>Viewport: {currentVpSize.w} x {currentVpSize.h}</div>
        <button onClick={updateCurrentSize} style={{marginTop: "8px", width: "100%"}}>Refresh</button>
      </div>

      <div className="section">
        <h3 className="section-title">Resize Templates</h3>
        <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {templates.map((t, i) => (
            <div key={i} className="row" style={{justifyContent: "space-between", flexWrap: "nowrap"}}>
              <button onClick={() => applySize(t)} style={{flex: 1, textAlign: "left", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"}}>
                {t.name} ({t.width}x{t.height} {t.mode === "window" ? "Win" : "VP"})
              </button>
              {i >= DEFAULT_TEMPLATES.length && (
                <button className="danger" onClick={() => deleteTemplate(i)} style={{minWidth: "40px"}}>Del</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Add Custom Size</h3>
        <div className="row">
          <input placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)} style={{flex: 1}} />
        </div>
        <div className="row">
          <input placeholder="W" type="number" value={customW} onChange={e => setCustomW(e.target.value)} style={{flex: 1, width: "60px"}} />
          <span style={{fontSize: "12px"}}>x</span>
          <input placeholder="H" type="number" value={customH} onChange={e => setCustomH(e.target.value)} style={{flex: 1, width: "60px"}} />
        </div>
        <div className="row">
          <select value={customMode} onChange={e => setCustomMode(e.target.value as SizeMode)} style={{flex: 1}}>
            <option value="window">Window</option>
            <option value="viewport">Viewport</option>
          </select>
          <button onClick={addCustomTemplate} style={{flex: 1}}>Add</button>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Screenshot</h3>
        <div className="row">
          <button onClick={() => takeScreenshot("takeVisibleScreenshot")} style={{flex: 1}}>Visible</button>
          <button onClick={() => takeScreenshot("takeFullScreenshot")} style={{flex: 1}}>Full Page</button>
        </div>
      </div>
      
      <div style={{textAlign: "right"}}>
        <button onClick={() => chrome.runtime.openOptionsPage()} style={{background: "transparent", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: "4px 8px"}}>
          ⚙ Settings
        </button>
      </div>
    </div>
  )
}

export default Popup