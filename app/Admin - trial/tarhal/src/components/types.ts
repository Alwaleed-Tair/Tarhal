export type FlightSearchDetails = {
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  tripType: string;
  passengers: number;
  cabinClass: string;
};

export type FlightOption = {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  price: number;
  badge?: string;
};

export type FlightDetails = FlightSearchDetails & {
  selectedFlight: FlightOption;
};
