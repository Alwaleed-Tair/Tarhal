const makeBooking = async () => {
  return fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: "test-user-id", // Replace with a real User ID from your database
      flightId: "test-flight-id", // Replace with a real Flight ID
      basePrice: 500,
      travelers: [{
        seatId: "test-seat-id", // Replace with a real, AVAILABLE Seat ID
        fullName: "Concurrent Tester",
        passportNumber: "X123456",
        dateOfBirth: "1995-05-05"
      }]
    })
  }).then(res => res.json());
};

// Simulate 5 users attempting to book the exact same seat at the exact same millisecond
Promise.all([makeBooking(), makeBooking(), makeBooking(), makeBooking(), makeBooking()])
  .then(responses => console.log(responses));