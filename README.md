
# Intersect 

### Find Your People. Build Real Connections.

Intersect is a social discovery platform designed to help people discover like-minded individuals, connect through shared interests, and build meaningful relationships. It aims to go beyond traditional profile-based discovery by encouraging genuine conversations, community participation, and shared experiences.

**Built independently by Alok for AFFECIO HACKS '26.**

---

## 🎯 Problem Statement

**Find Your People — Discover friends, communities, and activity partners.**

In a digitally connected world, finding people with shared interests and building meaningful relationships can still be challenging. Traditional social platforms can emphasize superficial interactions rather than helping people form genuine connections.

Intersect aims to make social discovery more personal, accessible, and engaging.

## 💡 My Solution

I built Intersect as a social discovery platform that brings people closer through shared interests, profile discovery, connection requests, and community-oriented interactions.

As a solo developer, I worked on the project's design, frontend development, backend integration, and overall implementation, with the goal of creating a foundation for more meaningful online connections.

## ✨ Key Features

- **People Discovery:** Explore profiles and discover people with shared interests.
- **User Profiles:** Personalize profiles with information such as bio, interests, and preferences.
- **Connection Requests:** Send, receive, and manage connection requests.
- **Direct Messaging:** Communicate with connections.
- **Communities & Channels:** Support community-oriented interactions and topic-based conversations.
- **Notifications:** Stay informed about connection activity and updates.
- **Privacy Controls:** Support safer social discovery through profile visibility settings.
- **Responsive UI:** A modern interface designed to make social discovery accessible and intuitive.

*Feature availability depends on the current implementation and backend configuration.*

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| JavaScript | Application logic |
| Vite | Development and build tooling |
| Supabase | Backend services and authentication |
| PostgreSQL | Database |
| Git & GitHub | Version control and source code hosting |

## 🏗️ Architecture

```text
User
  |
  v
React + Vite Frontend
  |
  v
Supabase JavaScript Client
  |
  v
Supabase Backend
  ├── Authentication
  ├── PostgreSQL Database
  ├── Row Level Security (RLS)
  └── Realtime Services (if configured)
```

The frontend communicates with Supabase through its JavaScript client. Database access should be protected using appropriate permissions and Row Level Security policies.

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Supabase project

### 1. Clone the repository

```bash
git clone https://github.com/Alok477/Intersect.git
cd Intersect
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Replace the placeholders with your Supabase project URL and publishable key (or legacy anon key).

Never expose Supabase secret keys, service-role keys, database passwords, or other privileged credentials in frontend code.

### 4. Configure the database

1. Open your Supabase project dashboard.
2. Navigate to the SQL Editor.
3. Review the database schema in the repository, if provided.
4. Apply the required SQL setup.
5. Verify the tables, permissions, and RLS policies.

### 5. Run the application

```bash
npm run dev
```

Open the local URL displayed in the terminal.

### 6. Build for production

```bash
npm run build
```

The production build is generated in the `dist/` directory.

## 🌍 Deployment

The application can be deployed to a frontend hosting platform such as Vercel, provided its configuration is compatible with the project.

1. Import the GitHub repository into your hosting platform.
2. Configure the required Supabase environment variables.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Deploy the application and test the deployed version.

## 🔐 Security

- Keep real environment files out of version control.
- Use placeholder values in `.env.example`.
- Never expose privileged Supabase keys.
- Enable RLS on exposed database tables.
- Review policies to prevent unauthorized access to user profiles and private conversations.
- Configure authentication redirect URLs appropriately.

## 🗺️ Future Scope

- Interest-based recommendations.
- Smarter people-discovery filters.
- Community and activity-group discovery.
- Enhanced profile verification and reporting.
- Improved messaging and virtual hangout experiences.
- More granular privacy controls.


## 👨‍💻 Developer

**Alok**  
B.Tech Computer Science and Engineering Student

- GitHub: [@Alok477](https://github.com/Alok477)
- Project Repository: [Intersect](https://github.com/Alok477/Intersect)



---

**Intersect — Discover people. Find your community. Build meaningful connections.**

1. In Vercel, import the project or deploy this folder with `npx vercel --prod`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** for Production (and Preview if needed). Redeploy after changing variables.
3. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) once.
4. In Supabase, enable Realtime for the `messages` and `channel_messages` tables.
5. In **Authentication → URL Configuration**, set the deployed Vercel URL as the Site URL and add it to the allowed redirect URLs.

The Vercel configuration builds with `npm run build`, serves `dist`, and falls back to `index.html` for client-side routes. Local environment files are excluded from deployment uploads.
