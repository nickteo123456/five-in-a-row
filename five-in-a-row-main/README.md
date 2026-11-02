# FIVE.IN.A.ROW 🎮

A Five-in-a-Row educational game with Supabase authentication and role-based access control.

## Setup

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## User Accounts

### Teacher Account
- **Email:** `iamnick0925@gmail.com`
- **Password:** `20040925nick`
- **Role:** Teacher (full dashboard access)

### Student Accounts
- Register with any email and password (6+ characters)
- Automatically assigned student role
- Access to game features



## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Supabase** - Database & Authentication
- **Tailwind CSS** - Styling
- **Radix UI** - UI components
- **bcryptjs** - Password hashing

## API Routes

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout


