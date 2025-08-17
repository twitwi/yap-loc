export /*async*/ function getDeviceLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      // enableHighAccuracy: true, // <- timeouting in firefox mobile...
      timeout: 15000,
      maximumAge: 10000,
    })
  })
}
