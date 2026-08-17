function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateTotalDistance(locations) {
  if (!Array.isArray(locations)) return 0;
  let total = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i-1];
    const curr = locations[i];
    if (prev.latitude != null && prev.longitude != null && curr.latitude != null && curr.longitude != null) {
      total += haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
  }
  return Math.round(total * 100) / 100;
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return null;
}

function buildTrackingPayload(tracking, location) {
  const latestLocation =
    location ||
    (Array.isArray(tracking.locations) && tracking.locations.length
      ? tracking.locations[tracking.locations.length - 1]
      : {});

  const bookingRef = tracking.bookingId;
  const providerRef = tracking.providerId;

  return {
    trackingId: normalizeId(tracking._id),
    bookingId: bookingRef && bookingRef.bookingId ? bookingRef.bookingId : normalizeId(bookingRef),
    bookingRef: normalizeId(bookingRef && bookingRef._id ? bookingRef._id : bookingRef),
    providerId: normalizeId(providerRef && providerRef._id ? providerRef._id : providerRef),
    providerName: providerRef && providerRef.name ? providerRef.name : null,
    status: tracking.status,
    distance: tracking.distance || calculateTotalDistance(tracking.locations),
    totalDistance: tracking.distance || calculateTotalDistance(tracking.locations),
    estimatedArrival: tracking.estimatedArrival || null,
    locationCount: Array.isArray(tracking.locations) ? tracking.locations.length : 0,
    latitude: latestLocation && latestLocation.latitude != null ? latestLocation.latitude : null,
    longitude: latestLocation && latestLocation.longitude != null ? latestLocation.longitude : null,
    address: latestLocation && latestLocation.address ? latestLocation.address : "Unknown",
    timestamp:
      (latestLocation && latestLocation.timestamp) ||
      tracking.updatedAt ||
      tracking.createdAt ||
      new Date(),
  };
}

module.exports = buildTrackingPayload;
