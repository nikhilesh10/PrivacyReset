const ALARM_NAME = "privacyreset-daily-cleanup";
const ALARM_PERIOD_MINUTES = 24 * 60;

async function clearSelectedData(keys, protectedOrigins = []) {
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
    await chrome.browsingData.remove({ since: 0 }, { history: true });
  }
}

async function runScheduledCleanup() {
  const settings = await chrome.storage.local.get([
    "scheduleEnabled",
    "cleanupSelection",
    "protectedOrigins"
  ]);
  const keys = Array.isArray(settings.cleanupSelection) ? settings.cleanupSelection : [];
  if (!settings.scheduleEnabled || keys.length === 0) return;

  const origins = Array.isArray(settings.protectedOrigins) ? settings.protectedOrigins : [];
  await clearSelectedData(keys, origins);
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get(["scheduleEnabled", "cleanupSelection"]);
  if (settings.scheduleEnabled && Array.isArray(settings.cleanupSelection) && settings.cleanupSelection.length) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "ENABLE_SCHEDULE") {
      const settings = await chrome.storage.local.get(["cleanupSelection"]);
      if (!Array.isArray(settings.cleanupSelection) || settings.cleanupSelection.length === 0) {
        throw new Error("No cleanup categories selected.");
      }
      await chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
      sendResponse({ ok: true });
    } else if (message?.type === "DISABLE_SCHEDULE") {
      await chrome.alarms.clear(ALARM_NAME);
      sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    runScheduledCleanup().catch((error) => console.error("PrivacyReset scheduled cleanup failed:", error));
  }
});