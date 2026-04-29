# SHEild Backend

Express.js backend for the SHEild women safety mobile application. It provides authentication, emergency contacts, SOS alerting, real-time group messaging, location sharing, and integrations with MongoDB, email, Google authentication, and Twilio SMS/WhatsApp.

## Purpose

The backend is the API, persistence, real-time communication, and emergency notification layer for SHEild. It validates authenticated requests from the React Native app, stores safety-related records in MongoDB, sends OTP emails, triggers emergency notifications, and coordinates Socket.IO group messaging.

## Technology Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| API framework | Express 5 |
| Database | MongoDB with Mongoose |
| Authentication | JWT, bcryptjs, Passport, Google OAuth |
| Validation | express-validator |
| Real-time | Socket.IO |
| Notifications | Twilio SMS and WhatsApp |
| Email | Nodemailer with Gmail SMTP |
| File/media handling | Multer, static `/uploads` serving, base64 media support |
| Configuration | dotenv |

## Directory Structure

```text
backend/
├── app.js                          # Express app, HTTP server, Socket.IO, route mounting
├── controllers/                    # Feature controllers
├── middleware/                     # JWT authentication middleware
├── models/                         # Mongoose schemas
├── routers/                        # Express route definitions and validation
├── services/                       # Third-party service clients
├── utilities/                      # Database, email, Cloudinary helpers
├── test-*.js                       # Manual SOS/Twilio test scripts
└── package.json
```

## Runtime Architecture

1. `app.js` loads environment variables and opens the MongoDB connection.
2. Express middleware parses JSON and URL-encoded bodies up to 10 MB, enables CORS, initializes Passport, and serves `/uploads`.
3. REST route modules are mounted under `/api/*`.
4. An HTTP server wraps the Express app.
5. Socket.IO is attached to the HTTP server and authenticates each socket with the same JWT secret.
6. Controllers use Mongoose models to read/write MongoDB documents and service clients for email or Twilio delivery.

## API Surface

### Authentication: `/api/auth`

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Create email/password user, hash password, generate OTP, send OTP email. |
| `POST` | `/verify-otp` | Verify registration OTP and return JWT. |
| `POST` | `/resend-otp` | Generate and send a new registration OTP. |
| `POST` | `/login` | Validate email/password and return JWT. |
| `GET` | `/profile` | Return authenticated user profile. |
| `PUT` | `/profile` | Update authenticated user profile. |
| `POST` | `/logout` | Confirm client logout. |
| `DELETE` | `/profile` | Delete authenticated user account. |
| `GET` | `/google` | Start Google OAuth flow. |
| `GET` | `/google/callback` | Google OAuth callback. |
| `GET` | `/google/failure` | Google OAuth failure handler. |
| `GET` | `/google/url` | Return Google auth URL for mobile clients. |
| `POST` | `/google/mobile` | Authenticate mobile Google token/profile payload. |
| `POST` | `/google/register` | Register a Google-authenticated user. |

### Emergency Contacts: `/api/emergency-contacts`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List contacts with pagination/search filters. |
| `GET` | `/:id` | Fetch a single emergency contact. |
| `POST` | `/` | Create a contact. |
| `PUT` | `/:id` | Update a contact. |
| `DELETE` | `/:id` | Delete/deactivate a contact. |
| `PUT` | `/:id/primary` | Set a contact as primary. |
| `POST` | `/bulk-import` | Import multiple contacts from the mobile contact book. |

### Groups and Messages: `/api/groups`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List groups for the authenticated user. |
| `POST` | `/` | Create a group and generate join code. |
| `POST` | `/join` | Join group by join code. |
| `GET` | `/:id` | Fetch group details. |
| `PUT` | `/:id` | Update group metadata. |
| `DELETE` | `/:id` | Delete/deactivate group. |
| `POST` | `/:id/leave` | Leave group. |
| `POST` | `/:groupId/members` | Add member to group. |
| `DELETE` | `/:groupId/members/:memberId` | Remove member. |
| `PUT` | `/:id/settings` | Update group permissions. |
| `PATCH` | `/:groupId/pin` | Toggle pinned state. |
| `PATCH` | `/:groupId/favorite` | Toggle favorite state. |
| `GET` | `/:groupId/messages` | Paginated group messages. |
| `PUT` | `/:groupId/messages/:messageId` | Edit text message. |
| `DELETE` | `/:groupId/messages/:messageId` | Soft delete message. |
| `GET` | `/:groupId/messages/:messageId/media` | Fetch stored media payload. |
| `POST` | `/:groupId/media` | Upload group image/audio media. |

### SOS: `/api/sos`

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/trigger` | Create SOS alert and notify contacts/groups. |
| `POST` | `/update-location` | Append active alert location update. |
| `GET` | `/history` | Return SOS history for user. |
| `GET` | `/:alertId` | Return SOS alert details. |
| `POST` | `/:alertId/cancel` | Cancel active alert. |
| `POST` | `/:alertId/resolve` | Resolve active alert. |

### Location: `/api/location`

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/update` | Upsert user's current location. |
| `GET` | `/visible` | List locations visible to requester. |
| `GET` | `/user/:targetUserId` | Fetch one visible user's location. |
| `PUT` | `/sharing-settings` | Update location privacy settings. |
| `PUT` | `/online-status` | Update online/offline state. |

## Socket.IO Events

| Direction | Event | Purpose |
| --- | --- | --- |
| Client to server | `joinGroup` | Join an authorized group room. |
| Client to server | `leaveGroup` | Leave a group room. |
| Client to server | `sendGroupMessage` | Persist and broadcast text, image, audio, or location message. |
| Server to client | `groupJoined` | Confirm room join. |
| Server to client | `messageSent` | Confirm sender message persistence. |
| Server to client | `groupMessage` | Deliver message to other group members. |
| Server to client | `groupError` | Report group/socket authorization or processing error. |

## Data Models

| Model | Main responsibility |
| --- | --- |
| `User` | Account identity, login type, email verification, profile fields, OAuth IDs. |
| `EmergencyContact` | User-owned trusted contact records, primary flag, relationship, priority. |
| `Group` | Safety groups, members, join codes, role flags, sharing/message permissions. |
| `GroupMessage` | Text/media/location group messages, edit/delete metadata, reactions, read state. |
| `SOSAlert` | Trigger metadata, latest location, device/network status, notification delivery records, location updates, status. |
| `UserLocation` | Current location, privacy settings, visibility rules, online state, battery/device metadata. |

## Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:password@cluster/database
JWT_SECRET=replace_with_a_strong_secret

EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+10000000000
TWILIO_WHATSAPP_NUMBER=+14155238886

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Email and Twilio integrations degrade gracefully in development when credentials are missing, but full OTP and emergency notification flows require valid credentials.

## Setup

Install dependencies:

```sh
npm install
```

Start the server:

```sh
node app.js
```

For development with reloads:

```sh
npx nodemon app.js
```

Health checks:

```sh
curl http://localhost:8000/onbaording
curl http://localhost:8000/api/test
```

## Security Notes

- Most feature routes require `Authorization: Bearer <jwt>`.
- Socket.IO connections are authenticated with the same JWT.
- Passwords are hashed with bcrypt before storage.
- JWT expiry is currently set to 7 days.
- CORS is open for development through `origin: true`; restrict this for production deployments.
- Do not commit real `.env` files, API keys, Twilio credentials, Google secrets, or MongoDB credentials.

## Notes for Research Documentation

Backend and whole-system architecture diagrams are maintained in [`../docs/architecture-diagrams.md`](../docs/architecture-diagrams.md). The diagrams group REST, real-time, persistence, and external notification providers into clean layers suitable for export.
