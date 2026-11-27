globalThis.PrivacyResetExposure = (() => {
  async function sha256Hex(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hashBuffer)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function classifyBreachDataClasses(dataClasses = []) {
    const categories = new Set();
    for (const item of dataClasses) {
      const lower = item.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("pin") ||
        lower.includes("security question") ||
        lower.includes("auth") ||
        lower.includes("token")
      ) {
        categories.add("Exposed Credentials");
      } else if (
        lower.includes("health") ||
        lower.includes("medical") ||
        lower.includes("prescription") ||
        lower.includes("blood")
      ) {
        categories.add("Personal Health Information (PHI)");
      } else if (
        lower.includes("credit card") ||
        lower.includes("bank") ||
        lower.includes("financial") ||
        lower.includes("income") ||
        lower.includes("tax") ||
        lower.includes("salary")
      ) {
        categories.add("Financial Information");
      } else if (
        lower.includes("geographic") ||
        lower.includes("ip address") ||
        lower.includes("physical address") ||
        lower.includes("location")
      ) {
        categories.add("Location-Related Information");
      } else {
        categories.add("Personally Identifiable Information (PII)");
      }
    }
    return categories.size > 0
      ? [...categories]
      : ["Personally Identifiable Information (PII)"];
  }

  async function scanDigitalFootprint({ username, email, fullName }) {
    const cleanUser = (username || "").trim();
    const cleanEmail = (email || "").trim();
    const cleanName = (fullName || "").trim();

    if (!cleanUser && !cleanEmail) {
      throw new Error("Enter at least a username or email address to check.");
    }

    const checkedAt = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const findings = [];

    // 1. Public GitHub Profile Check (Authorized REST API, no scraping)
    if (cleanUser) {
      if (!/^[a-zA-Z0-9-]{1,39}$/.test(cleanUser)) {
        throw new Error("Username contains invalid characters for public handle lookup.");
      }

      const apiUrl = `https://api.github.com/users/${encodeURIComponent(cleanUser)}`;
      const res = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" }
      });

      if (res.status === 200) {
        const profile = await res.json();
        const exposedFields = ["Public Handle"];
        if (profile.name) exposedFields.push("Display Name");
        if (profile.bio) exposedFields.push("Bio");
        if (profile.location) exposedFields.push("Location");
        if (profile.blog) exposedFields.push("Website URL");
        if (profile.company) exposedFields.push("Organization");

        const nameAligned =
          cleanName &&
          profile.name &&
          profile.name.toLowerCase().includes(cleanName.toLowerCase());

        findings.push({
          source: "GitHub Public Profile API",
          sourceUrl: profile.html_url || `https://github.com/${cleanUser}`,
          confidence: nameAligned ? "Verified Match (Handle + Name aligned)" : "Possible Match (Handle only — verify ownership)",
          categories: exposedFields,
          summary: `Public account found (${profile.public_repos ?? 0} public repos).${profile.location ? ` Listed location: ${profile.location}.` : ""}`,
          checkedAt
        });
      } else if (res.status === 404) {
        findings.push({
          source: "GitHub Public Profile API",
          sourceUrl: `https://github.com/${cleanUser}`,
          confidence: "No Public Match",
          categories: ["None"],
          summary: `No public GitHub account found for "${cleanUser}".`,
          checkedAt
        });
      } else {
        throw new Error(`GitHub API returned HTTP ${res.status}.`);
      }
    }

    // 2. Gravatar Public Hash Profile Check (SHA-256 hash lookup; email is hashed locally first)
    if (cleanEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error("Enter a valid email address.");
      }

      const hash = await sha256Hex(cleanEmail);
      const gravatarJsonUrl = `https://en.gravatar.com/${hash}.json`;
      const res = await fetch(gravatarJsonUrl);

      if (res.status === 200) {
        const data = await res.json();
        const entry = data?.entry?.[0] || {};
        const exposedFields = ["Email SHA-256 Hash Association", "Public Avatar"];
        if (entry.displayName) exposedFields.push("Display Name");
        if (entry.currentLocation) exposedFields.push("Location");
        if (Array.isArray(entry.urls) && entry.urls.length > 0) exposedFields.push("Linked Websites");

        findings.push({
          source: "Gravatar Public Profile (SHA-256 Lookup)",
          sourceUrl: entry.profileUrl || `https://en.gravatar.com/${hash}`,
          confidence: "Verified Match (Derived from your email hash)",
          categories: exposedFields,
          summary: `Public Gravatar profile linked to email hash${entry.displayName ? ` (Display name: ${entry.displayName})` : ""}.`,
          checkedAt
        });
      } else if (res.status === 404) {
        findings.push({
          source: "Gravatar Public Profile (SHA-256 Lookup)",
          sourceUrl: "https://en.gravatar.com/",
          confidence: "No Public Match",
          categories: ["None"],
          summary: "No public Gravatar profile associated with this email hash.",
          checkedAt
        });
      } else {
        throw new Error(`Gravatar lookup returned HTTP ${res.status}.`);
      }
    }

    return { checkedAt, findings };
  }

  async function checkAuthorizedBreaches({ serviceQuery, email, sessionApiKey }) {
    const query = (serviceQuery || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim();
    const apiKey = (sessionApiKey || "").trim();

    if (!query && !cleanEmail) {
      throw new Error("Enter a service/domain name (e.g., adobe) or an email with an authorized HIBP API key.");
    }

    const checkedAt = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    // Mode A: User-supplied HIBP API key (kept in RAM only, never saved to storage) for direct email check
    if (cleanEmail && apiKey) {
      const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(cleanEmail)}?truncateResponse=false`;
      const res = await fetch(url, {
        headers: {
          "hibp-api-key": apiKey,
          "user-agent": "PrivacyReset-ChromeExtension"
        }
      });

      if (res.status === 404) {
        return {
          mode: "Authorized Account Breach Check (HIBP)",
          checkedAt,
          records: []
        };
      }
      if (!res.ok) {
        throw new Error(`HIBP account check returned HTTP ${res.status}. Verify your API key or rate limit.`);
      }

      const breaches = await res.json();
      return {
        mode: "Authorized Account Breach Check (HIBP)",
        checkedAt,
        records: breaches.map((b) => ({
          title: b.Title || b.Name,
          domain: b.Domain || "N/A",
          breachDate: b.BreachDate || "Unknown",
          pwnCount: b.PwnCount || 0,
          riskCategories: classifyBreachDataClasses(b.DataClasses),
          rawClasses: b.DataClasses || []
        }))
      };
    }

    // Mode B: Public HIBP Breach Catalog (No API key required; searches known public breach metadata by service/domain)
    if (!query) {
      throw new Error("Provide an authorized HIBP API key for direct email lookup, or enter a service/domain name to search public breach metadata.");
    }

    const res = await fetch("https://haveibeenpwned.com/api/v3/breaches");
    if (!res.ok) {
      throw new Error(`HIBP public catalog returned HTTP ${res.status}.`);
    }

    const allBreaches = await res.json();
    const matched = allBreaches
      .filter(
        (b) =>
          (b.Name && b.Name.toLowerCase().includes(query)) ||
          (b.Title && b.Title.toLowerCase().includes(query)) ||
          (b.Domain && b.Domain.toLowerCase().includes(query))
      )
      .slice(0, 8);

    return {
      mode: "Public Breach Catalog Metadata (HIBP)",
      checkedAt,
      records: matched.map((b) => ({
        title: b.Title || b.Name,
        domain: b.Domain || "N/A",
        breachDate: b.BreachDate || "Unknown",
        pwnCount: b.PwnCount || 0,
        riskCategories: classifyBreachDataClasses(b.DataClasses),
        rawClasses: b.DataClasses || []
      }))
    };
  }

  return {
    scanDigitalFootprint,
    checkAuthorizedBreaches
  };
})();