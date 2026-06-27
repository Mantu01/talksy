# Talksy — Premium Real-Time Monorepo Chat Application

Talksy is a modern, real-time messaging application designed with high aesthetic standards and a robust monorepo architecture. Featuring real-time private messages, typing indicators, group chats, friend request management, group invitation moderation, and dynamic user presence, the application bridges a comprehensive Express & WebSocket backend with a React Native Expo mobile frontend.

---

## 🏗️ Monorepo Architecture

Talksy is structured as a **Turborepo** monorepo using **pnpm workspaces** for dependency orchestration:

```
├── apps/
│   ├── api/            # Express REST backend & WebSocket real-time engine (port 5000)
│   └── mobile/         # Expo Router cross-platform mobile frontend
├── packages/
│   └── database/       # Shared MongoDB models, mongoose schemas, and connector
├── package.json        # Global workspace commands and configuration
├── pnpm-workspace.yaml # Workspace package mapping
└── turbo.json          # Turborepo task runner configuration
```

- **`packages/database`**: Contains MongoDB schemas and exports standard Mongoose models (`User`, `Group`, `Message`). Shared directly by the API.
- **`apps/api`**: A Node.js backend running an Express server coupled with a raw WebSocket server (`ws` library). Uses JWT-based authorization and Multer + Cloudinary for image processing.
- **`apps/mobile`**: A React Native mobile app bootstrapped with Expo SDK 53 and Expo Router, styled with React Native Paper, and utilizing TanStack React Query for network requests and state management.

---

## ✨ Features & Functionality

### 1. User Authentication & Session Security
- **Secure Registration & Login**: Users authenticate using secure password hashing via `bcryptjs` on signup and receive JWT tokens.
- **Persistent Authorization Sessions**: Tokens are persisted using platform-aware storage: `localStorage` on Web browsers and `@react-native-async-storage/async-storage` on native iOS and Android environments.
- **Out-of-the-Box API Wrapper**: A central `apiRequest` client manages auto-token injection, handles multi-part `FormData` uploads seamlessly, and skips development tunnel warnings via dedicated headers.

### 2. User Profiles & Customize Headers
- **Visual Covers**: Users can view and upload profile banners and avatars.
- **Static File Fallbacks**: Image uploads utilize Cloudinary, but fall back gracefully to local static server routes (`public/uploads`) if credentials are not configured.
- **Custom Profile Editor**: Edit forms manage custom bios, name updates, birthdays, and secure password resets.
- **Public Profile Cards**: Dedicated detail screens display other users' public cover banners, avatars, name details, bio descriptions, and birthdays.

### 3. Real-Time Relationship Engine (Friends & Explore)
- **People Discovery**: Users can search for and explore registered users who are not yet their friends.
- **Friend Request Flow**: Send, accept, or decline friend requests with real-time updates.
- **Data Integrity**: Accepting or declining requests automatically synchronizes and cleans up incoming and outgoing invitation queues in the database.

### 4. Real-Time Direct Chatting (1-on-1)
- **Real-Time Delivery**: Messages are routed instantly through WebSockets when both users are online, and saved in the MongoDB message log for history tracking.
- **Typing Indicator Animation**: A sequential dot animation (built using React Native Animated value interpolation) triggers in real-time when the other user is typing.
- **Online Presence System**: Online friends are marked by a pulsing green online badge next to their avatar on details and chat rooms. Friends receive live status events (`online`/`offline`) when users connect or disconnect.

### 5. Chat Groups & Creator Moderation
- **Group Creation**: Creators can instantiate public chat rooms, uploading custom group logo badges and configuring titles and descriptions.
- **Join Invitation Moderation**: Public users can explore groups and request to join. The group's creator receives real-time requests and can approve or decline them via a dedicated moderation dashboard.
- **Group Administration**: Creators can modify group information (titles, descriptions, logo avatars) at any time.

### 6. Platform-Aware Notifications
- **In-App Toast Alerts**: Receives in-app notifications if a message or friend request arrives while the user is inside a different view of the app.
- **Native Notifications**: Connects with `expo-notifications` to display native device alerts.
- **Expo Go Stability**: Integrates dynamic conditional loading for notifications modules to prevent start-up crashes in environments lacking native support.

---

## 🛠️ Codebase Design & Rules

To maintain high standards, the following guidelines are strictly followed across the repository:
1. **No Code Comments**: The codebase contains absolutely no comments (no inline, block, or JSDoc comments).
2. **State Isolation (No `useState` or `useEffect`)**: The frontend avoids standard state hooks. Dynamic local states use query-backed cache keys through the custom hook `useLocalState` and direct TanStack Query Cache manipulation (`setQueryData` / `invalidateQueries`).
3. **TypeScript Only**: Strict type safety. The `any` type is banned throughout the project.
4. **Theme Orchestration**: Strictly uses `react-native-paper` component layers. Theme modifications and light/dark color palettes are handled entirely by the provider theme configs.

---

## 🔌 API Endpoints Reference

### Authentication Routing
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Login user and obtain session JWT | No |
| `GET` | `/api/auth/me` | Fetch active user credentials | Yes |

### User & Relationship Services
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/users/profile` | Update profile information (bio, dob, profile picture, banner) | Yes |
| `PUT` | `/api/users/change-password` | Update current account password | Yes |
| `GET` | `/api/users/friends` | Retrieve user's current friends | Yes |
| `GET` | `/api/users/friend-requests` | Retrieve user's incoming friend requests | Yes |
| `GET` | `/api/users/explore` | Retrieve potential users to connect with | Yes |
| `GET` | `/api/users/:id` | Fetch details of a specific user profile | Yes |
| `POST` | `/api/users/friend-request/send/:id` | Send a friend request | Yes |
| `POST` | `/api/users/friend-request/accept/:id` | Accept a pending friend request | Yes |
| `POST` | `/api/users/friend-request/decline/:id` | Decline a pending friend request | Yes |

### Group Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/groups` | Create a new group chatroom (supports logo upload) | Yes |
| `GET` | `/api/groups/joined` | Retrieve all groups the user is a member of | Yes |
| `GET` | `/api/groups/explore` | Retrieve public groups the user can join | Yes |
| `GET` | `/api/groups/:id` | Retrieve detailed information about a group | Yes |
| `PUT` | `/api/groups/:id` | Update group settings (Creator/Admin only) | Yes |
| `POST` | `/api/groups/join-request/:id` | Submit request to join a group | Yes |
| `POST` | `/api/groups/join-request/accept/:groupId/:userId` | Approve a member's join request (Creator only) | Yes |
| `POST` | `/api/groups/join-request/decline/:groupId/:userId` | Decline a member's join request (Creator only) | Yes |

### Messaging Logs
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chats/recent` | Fetch all recent direct & group conversations sorted chronologically | Yes |
| `GET` | `/api/chats/messages/:userId` | Fetch direct message history with a friend | Yes |
| `GET` | `/api/chats/group-messages/:groupId` | Fetch conversation history for a group | Yes |

---

## ⚡ WebSocket Server Events

The WebSocket connection operates under a token-query schema (`WS_URL?token=JWT_TOKEN`).

### Client-to-Server Events
- **Typing Indicator**: `{ "type": "typing", "recipientId": "ID", "typing": true|false }`
- **Sending Messages**: `{ "recipientId": "ID" | null, "groupId": "ID" | null, "text": "Message content" }`

### Server-to-Client Events
- **`user_status`**: Emitted when a friend connects (`online`) or disconnects (`offline`).
- **`online_friends`**: Emitted on connection, sending a list of all currently active friend IDs.
- **`typing`**: Relays the typing status of a specific user.
- **`message` / `message_sent`**: Dispatches newly saved messages to targets and logs verification status.
- **`friend_request_received` / `friend_request_sent`**: Dispatches real-time friend invitation updates.
- **`friend_request_accepted` / `friend_request_declined`**: Relays friend request results.
- **`group_join_request_received`**: Alerts group creators that a new user requested entry.
- **`group_join_request_accepted` / `group_join_request_declined`**: Sends updates on group access results to requesters.
- **`profile_updated`**: Informs chat screens to update layout images or details dynamically.

---

## 🚀 Setup & Development Guide

Follow these steps to run Talksy locally. This project utilizes `pnpm` exclusively.

### Prerequisites
- **Node.js**: `v18` or higher
- **pnpm**: Installation instructions at [pnpm.io](https://pnpm.io/installation)
- **MongoDB**: A running local instance (`mongodb://localhost:27017`) or a MongoDB Atlas URI

### 1. Install Workspace Dependencies
Bootstraps all monorepo dependencies and sets up package links inside the workspace:
```bash
pnpm install
```

### 2. Configure Environment Variables
Create `.env` configuration files inside the subproject folders or check the sample at the root:

#### API Server Configuration (`apps/api/.env`)
Copy the template and fill in your variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/talksy
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Optional: Add Cloudinary keys if configuring web file storage, 
# otherwise leave blank for local uploads folder uploads
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### Mobile Application Configuration (`apps/mobile/.env`)
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run the Development Servers
Start both the Express REST backend + WebSocket engine and the Expo bundler concurrently:
```bash
pnpm dev
```

The output terminal will expose the Expo Dev Server options:
- Press `w` to open in a web browser.
- Press `a` to open in an Android Emulator.
- Press `i` to open in an iOS Simulator.
- Scan the QR code with your mobile device using the **Expo Go** application.

---

## 📦 Workspace Commands

Run these workflows from the root folder using `pnpm`:

- **Compile and Build All Modules**:
  ```bash
  pnpm build
  ```
- **Type Checking (TypeScript verification)**:
  ```bash
  pnpm check-types
  ```
- **Run ESLint Linting**:
  ```bash
  pnpm lint
  ```
- **Code Format (Prettier)**:
  ```bash
  pnpm format
  ```
