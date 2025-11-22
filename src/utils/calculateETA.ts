export const calculateTravelTime = async (
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number }
): Promise<{ duration: number; distance: number } | null> => {
  try {
    // Convert addresses to coordinates if needed
    let originCoords: { lat: number; lng: number };
    let destCoords: { lat: number; lng: number };

    if (typeof origin === 'string') {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}&limit=1`
      );
      const data = await response.json();
      if (!data[0]) return null;
      originCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } else {
      originCoords = origin;
    }

    if (typeof destination === 'string') {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`
      );
      const data = await response.json();
      if (!data[0]) return null;
      destCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } else {
      destCoords = destination;
    }

    // Use OSRM for pedestrian routing (foot mode)
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false&steps=true`
    );
    
    const data = await response.json();
    
    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      const distanceInMeters = route.distance;
      
      // Calculate duration based on 3 mph walking speed
      // 3 mph = 4.828032 km/h = 1.34112 m/s
      const walkingSpeedMps = 1.34112; // meters per second
      const durationInSeconds = distanceInMeters / walkingSpeedMps;
      const durationInMinutes = Math.ceil(durationInSeconds / 60);
      
      return {
        duration: durationInMinutes,
        distance: distanceInMeters,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
};
