import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  async function start() {
    setError(null);
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) {
            onScan(result.getText());
            stop();
          }
        },
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not access the camera",
      );
      setScanning(false);
    }
  }

  // Open the camera immediately when the scanner mounts.
  useEffect(() => {
    void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitPaste() {
    if (!pasteValue.trim()) {
      setError("Paste a QR payload first");
      return;
    }
    setError(null);
    onScan(pasteValue.trim());
    setPasteValue("");
  }

  return (
    <div>
      <video
        ref={videoRef}
        className="scanner-video"
        style={{ display: scanning ? "block" : "none" }}
        muted
        playsInline
      />

      <div className="row">
        {scanning ? (
          <button type="button" className="secondary" onClick={stop}>
            Stop camera
          </button>
        ) : (
          <button type="button" onClick={() => void start()}>
            Start camera
          </button>
        )}
        <button
          type="button"
          className="text-link-button"
          onClick={() => setManualOpen((open) => !open)}
        >
          {manualOpen ? "Hide manual entry" : "Enter payload manually"}
        </button>
      </div>

      {manualOpen && (
        <>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="qr-paste">Paste the QR payload</label>
            <textarea
              id="qr-paste"
              rows={3}
              placeholder='{"rider":"0x…","operator":"0x…",…}'
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
          </div>
          <div className="row">
            <button type="button" className="secondary" onClick={submitPaste}>
              Use pasted payload
            </button>
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
