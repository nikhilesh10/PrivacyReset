const DATA_KEYS = ["cookies", "history", "cache", "localStorage"];
const $ = (id) => document.getElementById(id);

function selectedData() {
  return [...document.querySelectorAll('input[name="data"]:checked')].map((el) => el.value);
}

/* --- Tab Switching --- */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      const isMatch = panel.id === `tab-${target}`;
      panel.classList.toggle("active", isMatch);
      panel.hidden = !isMatch;
    });
  });
});

/* --- Module 1: Protected Websites & Cleanup --- */
function renderProtectedSites(origins) {
  const list = $("protectedSitesList");
  list.innerHTML = "";
  if (origins.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-item";
    empty.textContent = "No protected websites added.";
    list.appendChild(empty);
    return;
  }

  for (const origin of origins) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = origin;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const updated = await PrivacyResetProtectedSites.removeProtectedOrigin(origin);
      renderProtectedSites(updated);
      $("siteStatus").className = "status";
      $("siteStatus").textContent = `Removed ${origin}.`;
    });

    li.append(span, removeBtn);
    list.appendChild(li);
  }
}

async function handleAddSite() {
  $("siteStatus").textContent = "";
  $("siteStatus").className = "status";
  try {
    const updated = await PrivacyResetProtectedSites.addProtectedOrigin($("siteInput").value);
    $("siteInput").value = "";
    renderProtectedSites(updated);
    $("siteStatus").textContent = "Protected website added.";
  } catch (error) {
    $("siteStatus").className = "status error";
    $("siteStatus").textContent = error.message;
  }
}

async function loadSettings() {
  const saved = await chrome.storage.local.get(["cleanupSelection", "scheduleEnabled"]);
  const selected = saved.cleanupSelection || [];
  document.querySelectorAll('input[name="data"]').forEach((el) => {
    el.checked = selected.includes(el.value);
  });
  $("scheduleToggle").checked = Boolean(saved.scheduleEnabled);

  const origins = await PrivacyResetProtectedSites.getProtectedOrigins();
  renderProtectedSites(origins);
}

async function persistSelection() {
  await chrome.storage.local.set({ cleanupSelection: selectedData() });
}

document.querySelectorAll('input[name="data"]').forEach((el) => {
  el.addEventListener("change", async () => {
    await persistSelection();
    if ($("scheduleToggle").checked && selectedData().length === 0) {
      $("scheduleToggle").checked = false;
      await chrome.storage.local.set({ scheduleEnabled: false });
      await chrome.runtime.sendMessage({ type: "DISABLE_SCHEDULE" });
      $("scheduleStatus").textContent = "Schedule disabled because no cleanup categories are selected.";
    }
  });
});

$("addSiteButton").addEventListener("click", handleAddSite);
$("siteInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleAddSite();
});

$("cleanButton").addEventListener("click", async () => {
  const keys = selectedData();
  $("cleanupStatus").textContent = "";
  $("cleanupStatus").className = "status";
  if (keys.length === 0) {
    $("cleanupStatus").textContent = "Select at least one data type first.";
    return;
  }

  const warning =
    "Clear the selected browser data?\n\n" +
    "Protected websites will be excluded from supported cookies, cache, and local storage cleanup.\n\n" +
    "WARNING: Browsing history cleanup is global and will include protected websites.\n\nContinue?";
  if (!window.confirm(warning)) return;

  $("cleanButton").disabled = true;
  $("cleanupStatus").textContent = "Cleaning…";
  try {
    const protectedOrigins = await PrivacyResetProtectedSites.getProtectedOrigins();
    await PrivacyResetCleanup.clearSelectedData(keys, protectedOrigins);
    $("cleanupStatus").textContent = "Cleanup completed. Check browser behavior and website sessions.";
  } catch (error) {
    $("cleanupStatus").className = "status error";
    $("cleanupStatus").textContent = `Cleanup failed: ${error.message}`;
  } finally {
    $("cleanButton").disabled = false;
  }
});

$("scheduleToggle").addEventListener("change", async (event) => {
  const enabled = event.target.checked;
  const keys = selectedData();
  $("scheduleStatus").textContent = "";
  if (enabled && keys.length === 0) {
    event.target.checked = false;
    $("scheduleStatus").textContent = "Select at least one cleanup category before enabling the schedule.";
    return;
  }
  try {
    await chrome.storage.local.set({ scheduleEnabled: enabled, cleanupSelection: keys });
    await chrome.runtime.sendMessage({ type: enabled ? "ENABLE_SCHEDULE" : "DISABLE_SCHEDULE" });
    $("scheduleStatus").textContent = enabled ? "Daily cleanup enabled." : "Scheduled cleanup disabled.";
  } catch (error) {
    event.target.checked = !enabled;
    $("scheduleStatus").textContent = `Could not update schedule: ${error.message}`;
  }
});

/* --- Module 2: Local Fingerprint Inspection --- */
$("runFingerprintBtn").addEventListener("click", () => {
  const report = PrivacyResetFingerprint.analyze();
  $("fpMeta").textContent = `Inspected locally at ${report.timestamp} · ${report.signals.length} signal categories checked`;

  const container = $("fingerprintResults");
  container.innerHTML = "";
  for (const item of report.signals) {
    const card = document.createElement("div");
    card.className = "fp-card";

    const title = document.createElement("div");
    title.className = "fp-card-title";
    title.textContent = item.label;

    const val = document.createElement("div");
    val.className = "fp-card-val";
    val.textContent = item.value;

    const note = document.createElement("div");
    note.className = "fp-card-note";
    note.textContent = `Exposure: ${item.risk}`;

    const fix = document.createElement("div");
    fix.className = "fp-card-fix";
    fix.textContent = `Mitigation: ${item.mitigation}`;

    card.append(title, val, note, fix);
    container.appendChild(card);
  }
});

/* --- Local Check: URL Cleaner & Document PII Scanner --- */
$("cleanUrlBtn").addEventListener("click", () => {
  const out = $("urlResult");
  out.innerHTML = "";
  try {
    const res = PrivacyResetLocalAnalyzer.inspectUrl($("urlInput").value);
    const card = document.createElement("div");
    card.className = "analyzer-card";

    const summary = document.createElement("div");
    summary.textContent =
      res.removedParams.length > 0
        ? `Removed ${res.removedParams.length} tracker(s): ${res.removedParams.join(", ")}`
        : "No known tracking parameters found.";

    card.appendChild(summary);

    if (res.isHttpInsecure) {
      const warn = document.createElement("div");
      warn.style.color = "#ff8fa3";
      warn.textContent = "Warning: URL uses unencrypted HTTP instead of HTTPS.";
      card.appendChild(warn);
    }

    const code = document.createElement("code");
    code.className = "clean-url-out";
    code.textContent = res.cleanedUrl;
    card.appendChild(code);

    out.appendChild(card);
  } catch (error) {
    const errDiv = document.createElement("div");
    errDiv.className = "status error";
    errDiv.textContent = error.message;
    out.appendChild(errDiv);
  }
});

$("docFileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  const out = $("docResult");
  out.innerHTML = "";
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    const errDiv = document.createElement("div");
    errDiv.className = "status error";
    errDiv.textContent = "File exceeds 2 MB local scan limit.";
    out.appendChild(errDiv);
    return;
  }

  try {
    const text = await file.text();
    const res = PrivacyResetLocalAnalyzer.scanTextLocally(text, file.name);
    const card = document.createElement("div");
    card.className = "analyzer-card";

    const header = document.createElement("div");
    header.innerHTML = `<b>${res.fileName}</b> (${res.charCount.toLocaleString()} chars scanned locally)`;
    card.appendChild(header);

    if (res.findings.length === 0) {
      const clean = document.createElement("div");
      clean.style.color = "var(--green)";
      clean.textContent = "No common PII/token patterns detected.";
      card.appendChild(clean);
    } else {
      for (const f of res.findings) {
        const line = document.createElement("div");
        line.textContent = `• ${f.category}: ${f.count} potential match(es)`;
        card.appendChild(line);
      }
    }

    out.appendChild(card);
  } catch (error) {
    const errDiv = document.createElement("div");
    errDiv.className = "status error";
    errDiv.textContent = `Could not read file: ${error.message}`;
    out.appendChild(errDiv);
  }
});

loadSettings().catch((error) => {
  $("cleanupStatus").textContent = `Could not load settings: ${error.message}`;
});