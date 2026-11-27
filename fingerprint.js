globalThis.PrivacyResetFingerprint = (() => {
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "Unavailable";

      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#17365b";
      ctx.fillRect(0, 0, 220, 40);
      ctx.fillStyle = "#8bc5ff";
      ctx.fillText("PrivacyReset-Canvas-Check", 6, 10);

      const dataUrl = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < dataUrl.length; i++) {
        hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
        hash |= 0;
      }
      return `0x${(hash >>> 0).toString(16).padStart(8, "0")}`;
    } catch {
      return "Blocked or unavailable";
    }
  }

  function getWebGLDetails() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return { vendor: "Unavailable", renderer: "Unavailable" };

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        return {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Masked",
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Masked"
        };
      }
      return {
        vendor: gl.getParameter(gl.VENDOR) || "Generic",
        renderer: gl.getParameter(gl.RENDERER) || "Generic"
      };
    } catch {
      return { vendor: "Blocked", renderer: "Blocked" };
    }
  }

  function analyze() {
    const nav = navigator;
    const scr = window.screen;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
    const webgl = getWebGLDetails();
    const canvasHash = getCanvasFingerprint();

    const signals = [
      {
        label: "User-Agent & Browser",
        value: nav.userAgent,
        risk: "Reveals browser engine, exact version, and OS family on every HTTP request and JS check.",
        mitigation: "Keep Chrome updated so you blend into the largest current release cohort."
      },
      {
        label: "Platform & Hardware",
        value: `${nav.platform || "Unknown"} · ${nav.hardwareConcurrency || "?"} CPU threads · ${nav.deviceMemory || "?"} GB RAM hint`,
        risk: "Exposes device architecture and hardware tier, helping narrow down identical browser builds.",
        mitigation: "Avoid non-standard browser flags that expose extra hardware telemetry."
      },
      {
        label: "Screen & Color Depth",
        value: `${scr.width}x${scr.height} (${scr.colorDepth}-bit color)`,
        risk: "Full monitor resolution and color depth persist across incognito windows and cleared cookies.",
        mitigation: "Use non-maximized browser windows or enable letterboxing/anti-fingerprinting extensions when high privacy is needed."
      },
      {
        label: "Timezone & Languages",
        value: `${tz} · ${(nav.languages || [nav.language]).join(", ")}`,
        risk: "Pinpoints geographic region and locale even when traffic is routed through a VPN.",
        mitigation: "Align system timezone and browser language preferences with your VPN exit region when traveling or researching."
      },
      {
        label: "Canvas Rendering Hash",
        value: canvasHash,
        risk: "Subtle GPU, font-rasterization, and OS rendering differences produce a stable device signature.",
        mitigation: "Use canvas-randomization or strict anti-fingerprinting protections on untrusted sites."
      },
      {
        label: "WebGL GPU Renderer",
        value: `${webgl.vendor} — ${webgl.renderer}`,
        risk: "Exposes exact graphics card model and driver stack to 3D/canvas scripts.",
        mitigation: "Disable WebGL on high-risk profiles or use hardened browser profiles that mask renderer strings."
      }
    ];

    return {
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      signals
    };
  }

  return { analyze };
})();