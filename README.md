# KARNAN NEET UG Preparation Platform

A premium, localized EdTech platform designed to help students prepare for the NEET UG exam in both English and Tamil. Built as a high-performance Single Page Application (SPA) utilizing Vanilla JS, Vanilla CSS, and Supabase.

---

## 🚀 Features

*   **Authentication**: Secure authentication using Supabase Auth (supports Email/Password and Google OAuth Sign-in).
*   **Locked Daily Quizzes**: Delivers scheduled 20-question quiz sets globally to all students based on calendar dates.
*   **Session Hydration**: Quiz state is cached in local storage, allowing students to safely resume sessions if interrupted.
*   **Spaced-Repetition Flashcards**: Leitner Box cards powered by the SuperMemo-2 algorithm, with progress synced to `user_flashcard_progress`.
*   **True / False Mode**: Dynamic layout generator that automatically converts multiple-choice questions into True/False statements.
*   **Admin Panel Drawer**: Tools for scheduling daily locked quizzes, toggling chapter visibility, managing users, and updating configurations.
*   **Audit Logging**: Automatic logging of administrative changes to questions and configuration settings.

---

## 🛠 Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (ES6)
*   **Backend**: Supabase (Auth, Storage, Edge Functions)
*   **Database**: PostgreSQL (RLS, Constraints, Indexing)
*   **Integrations**: Google Sheets API (Sync Queue), SendGrid/SMTP (Email notifications)

---

## 📦 Directory Structure

```
├── assets/                  # Shared static files (images, icons)
├── css/                     # Styling components
│     └── styles.css         # Main stylesheet
├── data/                    # Local fallbacks and question JSON catalogs
│     ├── English/           # English question catalog
│     └── Tamil/             # Tamil question catalog
├── js/                      # Frontend JavaScript modules
│     ├── admin.js           # Admin limits configuration and scheduling
│     ├── app.js             # Main router and deep-linking router
│     ├── auth.js            # Authentication flow
│     ├── db.js              # Supabase API database adapter
│     ├── electrostatics.js  # Electrostatics quiz manager
│     ├── gamification.js    # Streak calculations and XP rewards
│     └── quiz.js            # Core quiz view and flashcards SM-2 logic
├── supabase/
│     └── migrations/        # Database migrations
└── index.html               # SPA entry point
```

---

## ⚙ Setup & Installation

### Prerequisites
*   Node.js (for local server execution)
*   Supabase Account & Project

### Local Server Setup
1.  Clone the repository:
    ```bash
    git clone https://github.com/username/examace.git
    cd examace
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file in the root directory.
    *   Add your Supabase keys:
        ```env
        SUPABASE_URL=your_project_url
        SUPABASE_ANON_KEY=your_anon_key
        ```
4.  Run the local development server:
    ```bash
    npm run dev
    ```

---

## 🗄 Database Configuration

Apply SQL migrations in your Supabase SQL Editor in alphabetical sequence:
1.  Run core schema migrations located in `supabase/migrations/`.
2.  Seed the Electrostatics question bank:
    ```sql
    -- Executes supabase/migrations/033_seed_electrostatics.sql
    ```
3.  Set up the Daily Quiz, Flashcards, and Queue tables:
    ```sql
    -- Executes supabase/migrations/034_new_features_schema.sql
    ```

---

## 🚀 Production Deployment

### Front-End Hosting
The application can be hosted on static providers (Vercel, Netlify, or GitHub Pages):
1.  Configure the build command: `npm run build` (or leave empty for static page routing).
2.  Set the publish directory: `./`.

### Supabase Settings
1.  Add your production domain to the **Redirect URIs** whitelist in the Supabase Dashboard settings (**Auth** ➔ **URL Configuration**).
2.  Enable Google Auth and insert your OAuth Client ID and Secret in **Auth** ➔ **Providers**.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
