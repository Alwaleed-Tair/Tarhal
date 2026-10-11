const makeBooking = async () => {
  return fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: "78b1a95f-4f1d-4274-9d18-2930265f7f51", // Replace with a real User ID from your database
      flightId: "7a27369b-65f9-4284-9e9d-e13708b8caec", // Replace with a real Flight ID
      basePrice: 500,
      travelers: [{
        seatId: "5ed783b7-5338-43ad-b75c-a321888a6f9f", // Replace with a real, AVAILABLE Seat ID
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