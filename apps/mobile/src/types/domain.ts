export type IdRef = string | { _id?: string; id?: string };

export interface TalksyUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  bio?: string;
  dob?: string;
  profile?: string;
  banner?: string;
  friends?: IdRef[];
  friendRequestsSent?: IdRef[];
  friendRequestsReceived?: IdRef[];
}

export interface TalksyGroup {
  _id: string;
  title: string;
  description?: string;
  logo?: string;
  createdBy?: IdRef | TalksyUser;
  members?: IdRef[];
  joinRequests?: Array<IdRef | TalksyUser>;
  createdAt?: string;
}

export interface TalksyMessage {
  _id: string;
  sender: TalksyUser | string;
  recipient?: TalksyUser | string;
  group?: TalksyGroup | string;
  text: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: TalksyUser;
}

export interface ChatListItem {
  key: string;
  id: string;
  title: string;
  subtitle: string;
  imageUri?: string;
  kind: "friend" | "group";
  membersCount?: number;
}

export interface GroupApproval {
  key: string;
  group: TalksyGroup;
  requester: TalksyUser;
}
