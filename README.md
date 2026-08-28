# TrustLens

**TrustLens** is an intelligent document analysis platform designed for academic and research environments. It empowers students, faculty, researchers, and administrators to perform automated **Factual Error Detection** against trusted reference sources and pairwise **Copied Content Detection** across multi-document submissions.

---

## Features

- **Factual Error Detection**: Extracts factual statements from uploaded documents (PDF, DOCX, images/scanned pages) and verifies them against a Trusted Knowledge Repository, classifying findings into Verified, Contradicted, or Insufficient Evidence.
- **Copied Content Detection**: Performs pairwise N(N-1)/2 textual overlap analysis across multi-document uploads or ZIP packages to highlight exact and near-exact copied passages.
- **Trusted Knowledge Repository**: Managed repository of verified textbook passages, academic articles, and digital reference documents used as ground-truth evidence.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across four distinct user roles:
  - **Student**: Access to Student Dashboard, Error Detection, Reports & History, Profile.
  - **Faculty**: Access to Dashboard, Error Detection, Copied Content Detection, Reports & History, Profile.
  - **Researcher**: Access to Dashboard, Error Detection, Copied Content Detection, Reports & History, Profile.
  - **Admin**: Full access to Admin Dashboard, User Management (Activation/Suspension), Trusted Knowledge Repository, Activity Logs, Admin Profile.
- **Reports & History**: Persistent storage of past analysis reports with detailed subcollection findings, search, filtering, pagination, and deletion capabilities.
- **Activity Logging & Security**: Audit trail of administrative actions, user account suspensions/activations, and secure ownership enforcement.

> [!IMPORTANT]
> **Accuracy & Scope Disclaimers**
> - **Error Detection Scope**: Error Detection verifies statement claims specifically against active trusted knowledge sources loaded in the repository. It is **not** guaranteed absolute universal truth verification.
> - **Copied Content Scope**: Copied Content Detection identifies exact or near-identical textual similarity between document passages. It **does not** analyze plagiarism of abstract ideas or independently make academic misconduct determinations.

---

## Technology Stack

- **Frontend**: React (Vite), React Router, Firebase Auth Client SDK, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Firebase Admin SDK.
- **Database**: Cloud Firestore.
- **Document Processing Pipeline**:
  - PDF Extraction (`pdf-parse`)
  - DOCX Extraction (`mammoth`)
  - Image OCR & Scanned PDF processing (`tesseract.js`)
  - ZIP Archive Extraction (`adm-zip` / `jszip`)

---

## Project Structure

```
trustlens/
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI, dashboard, & module components
│   │   ├── config/             # Firebase web config, API base URL, RBAC matrix
│   │   ├── context/            # AuthContext & global state
│   │   ├── layouts/            # DashboardLayout & AdminLayout
│   │   ├── pages/              # User & Admin view pages
│   │   ├── routes/             # AppRoutes & protected route guards
│   │   ├── services/           # API integration services
│   │   └── utils/              # Date formatting & sorting utilities
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/             # Firebase Admin SDK initialization
│   │   ├── controllers/        # Express route controllers
│   │   ├── middleware/         # Auth, Upload, RBAC, & Error handling middleware
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── services/           # Business logic & Firestore integration
│   │   └── utils/              # Helper utilities
│   ├── uploads/                # Temporary file upload directory (git-ignored)
│   ├── .env.example
│   ├── server.js               # Express application entrypoint
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Installation & Setup

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Firebase Project**: Firebase Auth and Cloud Firestore enabled.

### 1. Frontend Setup

```bash
cd Frontend
npm install
```

Create `.env` file from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Run frontend development server:

```bash
npm run dev
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file from `.env.example`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json
```

Place your Firebase Service Account JSON key in `backend/src/config/serviceAccountKey.json`.

Start backend server:

```bash
npm start
```

---

## Environment Variables

### Frontend (`Frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for backend REST API (default: `http://localhost:5000/api`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web Client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project Identifier |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port for Express HTTP server (default: `5000`) |
| `CLIENT_URL` | Allowed CORS client origin (default: `http://localhost:5173`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase Admin SDK service account JSON |

---

## Firestore Database Architecture

TrustLens utilizes Cloud Firestore with the following collection hierarchy:

1. **`users`**
   - Document ID: `userUid`
   - Fields: `name`, `email`, `role` (`student`\|`faculty`\|`researcher`\|`admin`), `status` (`active`\|`suspended`), `createdAt`, `updatedAt`

2. **`knowledgeSources`**
   - Document ID: Auto-generated
   - Fields: `title`, `category`, `description`, `sourceType` (`file`\|`text`\|`url`), `extractedText`, `textLength`, `status` (`active`\|`deleted`), `createdBy`, `createdAt`

3. **`reports`**
   - Document ID: Auto-generated
   - Fields: `userId`, `userName`, `userEmail`, `reportType` (`error-detection`\|`copied-content`), `title`, `status`, `document`, `summary`, `createdAt`
   - Subcollections:
     - **`reports/{reportId}/findings`**: Individual statement factual check results (`statement`, `classification`, `severity`, `reason`, `evidence`).
     - **`reports/{reportId}/documentPairs`**: Pairwise comparison results (`pairId`, `docA`, `docB`, `similarityScore`, `matchedPassages`).

4. **`activityLogs`**
   - Document ID: Auto-generated
   - Fields: `type`, `actorUid`, `targetId`, `message`, `timestamp`

---

## Major API Endpoints

### Authentication & User APIs
- `GET /api/users/me` — Retrieve current user profile (Requires Auth)
- `POST /api/users/profile` — Initialize user profile (Requires Auth)

### Document & Extraction APIs
- `POST /api/documents/upload/single` — Upload document for Error Detection (Requires Auth)
- `POST /api/documents/upload/multiple` — Upload multiple documents (Requires Auth)
- `POST /api/documents/upload/zip` — Upload ZIP document package (Requires Auth)
- `POST /api/extraction/error-detection` — Extract text for Error Detection (Requires Auth)
- `POST /api/extraction/copied-content` — Extract text for Copied Content (Requires Auth)

### Analysis Engines
- `POST /api/error-detection/analyze` — Run factual error verification engine (Requires Auth, Student/Faculty/Researcher)
- `POST /api/copied-content/analyze` — Run pairwise copied content detection engine (Requires Auth, Faculty/Researcher)

### Reports & History APIs
- `GET /api/reports` — List authenticated user's reports with search & filter params
- `GET /api/reports/stats/summary` — User report summary statistics
- `GET /api/reports/:id` — Retrieve full report detail with subcollection data
- `DELETE /api/reports/:id` — Delete report document and subcollection findings

### Admin Management APIs
- `GET /api/admin/dashboard` — System statistics summary (Requires Admin Role)
- `GET /api/admin/users` — Paginated user management list (Requires Admin Role)
- `PATCH /api/admin/users/:userId/status` — Suspend or activate user account (Requires Admin Role)
- `GET /api/admin/activity` — View system audit logs (Requires Admin Role)
- `GET /api/knowledge` — List active trusted knowledge sources (Requires Admin Role)
- `POST /api/knowledge/upload` — Add file to Trusted Knowledge Repository (Requires Admin Role)

---

## Known Limitations

1. **Knowledge Source Dependency**: Error Detection quality is proportional to the breadth and accuracy of active documents loaded in the Trusted Knowledge Repository.
2. **Insufficient Evidence Scope**: Statements marked as "Insufficient Evidence" indicate a lack of matching statements in active sources, not proof that the statement is false.
3. **Similarity vs. Plagiarism**: Copied Content Detection measures literal and near-exact phrase matches. Semantic restructuring or conceptual overlap is not evaluated.
4. **Scale & Storage**: Search and pairwise comparisons are optimized for mini-project and academic department scale. Production enterprise scale would benefit from vector index optimizations.
