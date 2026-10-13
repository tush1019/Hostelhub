import test from 'node:test';
import assert from 'node:assert/strict';

import HostelManager, { Room } from '../src/hostel.js';

test('check-in assigns a resident to an available room', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'A-101', type: 'single', rentPerMonth: 3500, capacity: 1 }));

  const resident = manager.checkIn({ id: 'R-001', name: 'Aisha', phone: '9876543210' }, 'single');

  assert.equal(resident.roomId, 'A-101');
  assert.equal(manager.getResident('R-001').name, 'Aisha');
});

test('full rooms reject additional residents', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'B-201', type: 'double', rentPerMonth: 6000, capacity: 1 }));
  manager.checkIn({ id: 'R-101', name: 'Karan' }, 'double');

  assert.throws(() => manager.checkIn({ id: 'R-102', name: 'Nina' }, 'double'), /No room available/i);
});

test('check-out removes a resident and frees the room', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'C-301', type: 'single', rentPerMonth: 3500, capacity: 1 }));
  manager.checkIn({ id: 'R-201', name: 'Mira' }, 'single');

  assert.equal(manager.checkOut('R-201'), true);
  assert.equal(manager.getResident('R-201'), null);
  assert.equal(manager.getSummary().availableRooms, 1);
});

test('summary reflects occupancy and revenue', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'D-401', type: 'single', rentPerMonth: 3500, capacity: 1 }));
  manager.addRoom(new Room({ id: 'D-402', type: 'double', rentPerMonth: 5000, capacity: 2 }));

  manager.checkIn({ id: 'R-301', name: 'Pooja', rentPerMonth: 3500 }, 'single');
  manager.checkIn({ id: 'R-302', name: 'Rohit', rentPerMonth: 2500 }, 'double');

  const summary = manager.getSummary();

  assert.equal(summary.totalRooms, 2);
  assert.equal(summary.occupiedRooms, 2);
  assert.equal(summary.totalOccupants, 2);
  assert.equal(summary.monthlyRevenue, 6000);
});

test('requested room type must match an available room', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'E-501', type: 'double', rentPerMonth: 5000, capacity: 2 }));

  assert.throws(() => manager.checkIn({ id: 'R-401', name: 'Ari' }, 'single'), /No room available/i);
});

test('partially filled rooms still count as available', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'F-601', type: 'single', rentPerMonth: 3000, capacity: 1 }));
  manager.addRoom(new Room({ id: 'F-602', type: 'double', rentPerMonth: 4800, capacity: 2 }));

  manager.checkIn({ id: 'R-501', name: 'Jiya' }, 'single');
  manager.checkIn({ id: 'R-502', name: 'Kabir' }, 'double');

  const summary = manager.getSummary();

  assert.equal(summary.occupiedRooms, 2);
  assert.equal(summary.availableRooms, 1);
});

test('duplicate resident ids are rejected', () => {
  const manager = new HostelManager();
  manager.addRoom(new Room({ id: 'G-701', type: 'single', rentPerMonth: 3200, capacity: 1 }));
  manager.addRoom(new Room({ id: 'G-702', type: 'single', rentPerMonth: 3200, capacity: 1 }));

  manager.checkIn({ id: 'R-601', name: 'Lena' }, 'single');

  assert.throws(() => manager.checkIn({ id: 'R-601', name: 'Leena' }, 'single'), /already checked in/i);
});
