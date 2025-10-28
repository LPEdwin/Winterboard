import { isMobile } from "../device";

const fpsDiv = ensureFpsDiv();
let currentFps: number = 0;
let frames: number = 0;
let prevTime: number = 0;

export function renderFps(delta: number) {
    frames++;
    const time = performance.now();

    if (time >= prevTime + 1000) {

        currentFps = Math.round((frames * 1000) / (time - prevTime));

        frames = 0;
        prevTime = time;

    }
    fpsDiv.textContent = `${currentFps.toFixed(0)} fps`;
}

function ensureFpsDiv() {
    let el = document.getElementById("fps") as HTMLDivElement | null;
    if (!el) {
        el = document.createElement("div");
        el.id = "fps";
        Object.assign(el.style, {
            position: "fixed",
            top: "8px",
            left: "8px",
            padding: "4px 8px",
            fontFamily: "monospace",
            fontSize: isMobile() ? "3rem" : "14px",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            borderRadius: "6px",
            zIndex: "9999",
            userSelect: "none",
        });
        document.body.appendChild(el);
    }
    return el;
}