interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver_type?: string;
  maneuver_modifier?: string;
}

export const calculateTravelTime = async (
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number }
): Promise<{ duration: number; distance: number; steps: RouteStep[] } | null> => {
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
      
      // Extract turn-by-turn steps from OSRM response
      const steps: RouteStep[] = [];
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        route.legs[0].steps.forEach((step: any, index: number) => {
          const maneuver = step.maneuver;
          let instruction = '';
          
          // Generate human-readable instruction
          if (maneuver.type === 'depart') {
            instruction = `Start on ${step.name || 'the path'}`;
          } else if (maneuver.type === 'arrive') {
            instruction = 'Arrive at destination';
          } else if (maneuver.type === 'turn') {
            const modifier = maneuver.modifier || '';
            instruction = `Turn ${modifier} onto ${step.name || 'the path'}`;
          } else if (maneuver.type === 'end of road') {
            instruction = `At the end of the road, turn ${maneuver.modifier || ''} onto ${step.name || 'the path'}`;
          } else if (maneuver.type === 'fork') {
            instruction = `At the fork, keep ${maneuver.modifier || ''} onto ${step.name || 'the path'}`;
          } else if (maneuver.type === 'continue') {
            instruction = `Continue on ${step.name || 'the path'}`;
          } else {
            instruction = `${maneuver.type} ${maneuver.modifier || ''} ${step.name ? 'onto ' + step.name : ''}`.trim();
          }
          
          steps.push({
            instruction,
            distance: step.distance,
            duration: step.duration,
            maneuver_type: maneuver.type,
            maneuver_modifier: maneuver.modifier,
          });
        });
      }
      
      return {
        duration: durationInMinutes,
        distance: distanceInMeters,
        steps,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
};
