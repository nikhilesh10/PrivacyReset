globalThis.PrivacyResetCleanup = {
  async clearSelectedData(keys, protectedOrigins = []) {
    const supported = {};
    for (const key of ["cookies", "cache", "localStorage"]) {
      if (keys.includes(key)) {
        supported[key] = true;
      }
    }

    if (Object.keys(supported).length > 0) {
      const options = { since: 0 };
      if (Array.isArray(protectedOrigins) && protectedOrigins.length > 0) {
        options.excludeOrigins = protectedOrigins;
      }
      await chrome.browsingData.remove(options, supported);
    }

    if (keys.includes("history")) {
      // Chrome's excludeOrigins does not apply to browsing history
      await chrome.browsingData.remove({ since: 0 }, { history: true });
    }
  }
};