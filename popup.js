const DATA_KEYS = ["cookies", "history", "cache", "localStorage"];
const $ = (id) => document.getElementById(id);

function selectedData() {
  return [...document.querySelectorAll('input[name="data"]:checked')].map((el) => el.value);
}

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

loadSettings().catch((error) => {
  $("cleanupStatus").textContent = `Could not load settings: ${error.message}`;
});