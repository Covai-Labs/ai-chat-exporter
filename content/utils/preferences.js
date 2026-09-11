export const DEFAULT_INCLUDE_ATTRIBUTION = true;

export async function getAttributionSetting() {
  try {
    const syncData = await chrome.storage.sync.get('includeAttribution');
    if (syncData && syncData.includeAttribution !== undefined) {
      return syncData.includeAttribution;
    }
  } catch {
    // Ignore storage errors and fall back to the default
  }
  return DEFAULT_INCLUDE_ATTRIBUTION;
}
