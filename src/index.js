import HostelManager, { Room } from './hostel.js';

const manager = new HostelManager();
manager.addRoom(new Room({ id: 'A-101', type: 'single', rentPerMonth: 3500, capacity: 1 }));
manager.addRoom(new Room({ id: 'A-102', type: 'double', rentPerMonth: 6000, capacity: 2 }));

const resident = manager.checkIn({ id: 'R-001', name: 'Aisha', phone: '9876543210' }, 'single');
console.log(`Checked in ${resident.name} to room ${resident.roomId}.`);
console.log(manager.getSummary());
