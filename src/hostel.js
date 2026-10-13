export class Room {
  constructor({ id, type, rentPerMonth, capacity = 1 }) {
    this.id = id;
    this.type = type;
    this.rentPerMonth = rentPerMonth;
    this.capacity = capacity;
    this.residents = [];
  }

  addResident(resident) {
    if (this.isFull()) {
      throw new Error(`Room ${this.id} is full.`);
    }

    if (this.residents.some((item) => item.id === resident.id)) {
      throw new Error(`Resident ${resident.id} is already assigned to room ${this.id}.`);
    }

    this.residents.push({ ...resident });
  }

  removeResident(residentId) {
    const index = this.residents.findIndex((resident) => resident.id === residentId);
    if (index === -1) {
      return false;
    }

    this.residents.splice(index, 1);
    return true;
  }

  isAvailable() {
    return this.residents.length < this.capacity;
  }

  isFull() {
    return !this.isAvailable();
  }

  getOccupancy() {
    return this.residents.length;
  }
}

export class HostelManager {
  constructor() {
    this.rooms = [];
    this.residents = new Map();
  }

  addRoom(room) {
    if (this.rooms.some((item) => item.id === room.id)) {
      throw new Error(`Room ${room.id} already exists.`);
    }

    this.rooms.push(room);
    return room;
  }

  findAvailableRoom(preferredType = null) {
    const candidates = this.rooms.filter((room) => room.isAvailable());
    if (!preferredType) {
      return candidates[0] ?? null;
    }

    return candidates.find((room) => room.type === preferredType) ?? null;
  }

  checkIn(student, preferredType = null) {
    if (this.residents.has(student.id)) {
      throw new Error(`Resident ${student.id} is already checked in.`);
    }

    const room = this.findAvailableRoom(preferredType);
    if (!room) {
      throw new Error('No room available for the requested type.');
    }

    const resident = {
      id: student.id,
      name: student.name,
      phone: student.phone ?? '',
      roomId: room.id,
      rentPerMonth: student.rentPerMonth ?? room.rentPerMonth,
      type: student.type ?? room.type,
    };

    room.addResident(resident);
    this.residents.set(resident.id, resident);
    return resident;
  }

  checkOut(residentId) {
    const resident = this.residents.get(residentId);
    if (!resident) {
      return false;
    }

    const room = this.rooms.find((item) => item.id === resident.roomId);
    if (room) {
      room.removeResident(residentId);
    }

    this.residents.delete(residentId);
    return true;
  }

  getResident(residentId) {
    return this.residents.get(residentId) ?? null;
  }

  getRoomsByType(type) {
    return this.rooms.filter((room) => room.type === type);
  }

  getSummary() {
    const totalRooms = this.rooms.length;
    const occupiedRooms = this.rooms.filter((room) => room.getOccupancy() > 0).length;
    const availableRooms = this.rooms.filter((room) => room.isAvailable()).length;
    const totalOccupants = Array.from(this.residents.values()).length;
    const monthlyRevenue = Array.from(this.residents.values()).reduce(
      (sum, resident) => sum + (resident.rentPerMonth ?? 0),
      0,
    );

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      totalOccupants,
      monthlyRevenue,
    };
  }
}

export default HostelManager;
