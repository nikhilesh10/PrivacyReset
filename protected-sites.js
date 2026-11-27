globalThis.PrivacyResetProtectedSites = (() => {
  const STORAGE_KEY = "protectedOrigins";

  function normalizeOrigin(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      throw new Error("Enter a website address (e.g., example.com).");
    }

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      throw new Error("Only HTTP and HTTPS websites are supported.");
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let parsed;
    try {
      parsed = new URL(withProtocol);
    } catch {
      throw new Error("Invalid website address.");
    }

    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) {
      throw new Error("Enter a valid domain (e.g., example.com).");
    }

    return parsed.origin;
  }

  async function getProtectedOrigins() {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  }

  async function addProtectedOrigin(rawInput) {
    const origin = normalizeOrigin(rawInput);
    const current = await getProtectedOrigins();

    if (current.includes(origin)) {
      throw new Error(`${origin} is already in your protected list.`);
    }

    const updated = [...current, origin];
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    return updated;
  }

  async function removeProtectedOrigin(originToRemove) {
    const current = await getProtectedOrigins();
    const updated = current.filter((origin) => origin !== originToRemove);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    return updated;
  }

  return {
    getProtectedOrigins,
    addProtectedOrigin,
    removeProtectedOrigin
  };
})();