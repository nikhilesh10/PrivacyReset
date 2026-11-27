globalThis.PrivacyResetLocalAnalyzer = (() => {
  const TRACKING_PARAMS = new Set([
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid", "ref", "ref_src",
    "igshid", "si", "yclid", "_hsenc", "_hsmi"
  ]);

  function inspectUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) throw new Error("Enter a URL to inspect.");

    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed;
    try {
      parsed = new URL(withProto);
    } catch {
      throw new Error("Invalid URL format.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }

    const removed = [];
    const kept = [];
    for (const [key] of parsed.searchParams.entries()) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        removed.push(key);
      } else {
        kept.push(key);
      }
    }

    for (const key of removed) {
      parsed.searchParams.delete(key);
    }

    return {
      isHttpInsecure: parsed.protocol === "http:",
      removedParams: [...new Set(removed)],
      remainingParams: [...new Set(kept)],
      cleanedUrl: parsed.toString()
    };
  }

  function scanTextLocally(text, fileName) {
    const patterns = [
      {
        category: "Email Addresses",
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
      },
      {
        category: "Phone Numbers (Potential)",
        regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g
      },
      {
        category: "IPv4 Addresses",
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g
      },
      {
        category: "API Keys / Bearer Tokens (Pattern)",
        regex: /\b(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z-_]{35}|Bearer\s+[A-Za-z0-9\-._~+/]+=*)\b/g
      },
      {
        category: "Long Numeric IDs / Card-like Sequences (13–19 digits)",
        regex: /\b(?:\d[ -]*?){13,19}\b/g
      }
    ];

    const findings = [];
    for (const item of patterns) {
      const matches = text.match(item.regex);
      if (matches && matches.length > 0) {
        findings.push({
          category: item.category,
          count: matches.length
        });
      }
    }

    return {
      fileName,
      charCount: text.length,
      findings
    };
  }

  return { inspectUrl, scanTextLocally };
})();