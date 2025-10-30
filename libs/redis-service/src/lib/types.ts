export interface UserPresenceData {
  userId: string;
  userName: string;
  customer_id: string;
  roles: string | string[];
  connectedAt: number;
  lastSeen: number;
  socketId: string;
}
