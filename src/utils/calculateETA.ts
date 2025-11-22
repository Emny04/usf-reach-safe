export const calculateTravelTime = async (
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number }
): Promise<{ duration: number; distance: number } | null> => {
  try {
    const service = new google.maps.DistanceMatrixService();
    
    const result = await service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.WALKING,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    });

    if (result.rows[0]?.elements[0]?.status === 'OK') {
      const element = result.rows[0].elements[0];
      return {
        duration: Math.ceil(element.duration.value / 60), // Convert seconds to minutes
        distance: element.distance.value, // meters
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
};
