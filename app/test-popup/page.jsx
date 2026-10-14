'use client';
import { useState } from 'react';
import ConfirmationPopup from './ConfirmationPopup'; // Adjust path if needed

export default function TestPage() {
  const [isOpen, setIsOpen] = useState(true);

  // Mock data matching Tariq's expected prop structure
  const mockFlight = {
    tripType: 'Round trip',
    from: 'RUH',
    to: 'JED',
    departure: '2026-10-20',
    returnDate: '2026-10-25',
    passengers: 2,
    cabinClass: 'Economy',
  };

  const mockCar = {
    car: 'Toyota Camry',
    location: 'Jeddah Airport',
    pickup: '2026-10-20',
    returnDate: '2026-10-25',
    dailyRate: 150,
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => setIsOpen(true)}>Open Popup</button>

      {isOpen && (
        <ConfirmationPopup 
          flight={mockFlight} 
          car={mockCar} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
}