import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"
import "./styles.css"

const storage = new Storage()
const syncStorage = new Storage({ area: "sync" })

function Options() {
  const [captureDir, setCaptureDir] = useState("Captures")
  const [useSync, setUseSync] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")

  useEffect(() => {
    storage.get("useSyncSettings").then((syncFlag) => {
      const isSync = !!syncFlag
      setUseSync(isSync)
      const activeStorage = isSync ? syncStorage : storage
      activeStorage.get("captureDir").then((dir) => {
        if (dir) setCaptureDir(dir as string)
      })
    })
  }, [])

  const handleSave = async () => {
    await storage.set("useSyncSettings", useSync)
    const activeStorage = useSync ? syncStorage : storage
    await activeStorage.set("captureDir", captureDir || "Captures")
    
    setSavedMsg("Settings saved successfully!")
    setTimeout(() => setSavedMsg(""), 3000)
  }

  return (
    <div className="container" style={{ maxWidth: "400px", margin: "40px auto" }}>
      <h2>Extension Settings</h2>
      
      <div className="section">
        <h3 className="section-title">Screenshot Directory</h3>
        <p style={{fontSize: "12px", color: "gray"}}>
          Relative to your browser's default downloads folder.
        </p>
        <input 
          type="text" 
          value={captureDir} 
          onChange={(e) => setCaptureDir(e.target.value)} 
          style={{width: "100%"}}
        />
      </div>

      <div className="section">
        <h3 className="section-title">Storage Sync</h3>
        <label className="row" style={{cursor: "pointer"}}>
          <input 
            type="checkbox" 
            checked={useSync} 
            onChange={(e) => setUseSync(e.target.checked)} 
          />
          Sync settings across devices (requires browser sign-in)
        </label>
      </div>

      <button onClick={handleSave} style={{width: "100%", padding: "10px"}}>
        Save Settings
      </button>

      {savedMsg && <p style={{color: "green", textAlign: "center", marginTop: "10px"}}>{savedMsg}</p>}
    </div>
  )
}

export default Options