# Image Upload App - Project Context

## Project Overview
A React-based web application that allows users to upload and manage up to 60 personal images in their profile. Each user can only see and manage their own images.

## Tech Stack
- **Frontend**: React 19.1.1 with Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.x (using PostCSS)
- **Backend/Database**: Supabase
- **Routing**: React Router DOM 7.9.3
- **Additional Libraries**: 
  - react-dropzone (drag-and-drop uploads)
  - react-hot-toast (notifications)

## Database Structure

### Table: `user_images`
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- image_url: text (full URL to image)
- storage_path: text (path in storage bucket)
- display_order: integer (optional)
- uploaded_at: timestamp
- file_size: integer (optional)
- metadata: jsonb (optional - for dimensions, alt text, etc)
- score: integer
- created_at: timestamp
```

**Constraints**:
- Maximum 60 images per user (enforced by database trigger)
- Row Level Security (RLS) enabled - users can only CRUD their own images

## Storage Configuration

### Bucket: `profile-images`
- **Type**: Private bucket (not public)
- **Structure**: `{user_id}/{timestamp}_{filename}`
- **Policies**: 
  - Users can SELECT/INSERT/UPDATE/DELETE only in their own folder
  - No public access

## Project File Structure
```
my-image-app/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   └── AuthLayout.jsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ImageGallery.jsx
│   │   │   ├── ImageUploader.jsx
│   │   │   └── ImageCard.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── Layout.jsx
│   │   └── common/
│   │       ├── ProtectedRoute.jsx
│   │       └── LoadingSpinner.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── DashboardPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useImages.js
│   ├── utils/
│   │   └── imageHelpers.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.local (contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Key Features to Implement

1. **Authentication**:
   - Email/password
   - Registration flow
   - Protected routes that redirect to login

2. **Landing Page**:
   - Marketing/intro page for non-authenticated users
   - Login/Register buttons
   - Basic app description

3. **Dashboard**:
   - Displays user's uploaded images in a grid
   - Shows count (X/60 images)
   - Image upload interface with drag-and-drop
   - Delete image functionality
   - Reorder images (using display_order)

4. **Image Upload Flow**:
   - User selects/drops image(s)
   - Upload to Supabase Storage → get storage path
   - Create record in user_images table
   - Display success/error with toast
   - Prevent upload if already at 60 images

5. **Image Display**:
   - Generate signed URLs for private images
   - Lazy loading for performance
   - Responsive grid layout
   - Click to view full size

## Important Considerations

### Security
- All images are private to each user
- Use signed URLs for image display (1-hour expiry recommended)
- RLS policies prevent cross-user access
- Validate file types (images only) and size limits client-side

### Performance
- Implement pagination or virtual scrolling for 60 images
- Compress/resize images before upload if needed
- Use lazy loading for images not in viewport
- Cache signed URLs appropriately

### User Experience
- Clear upload progress indicators
- Drag-and-drop zone
- Show remaining image slots (e.g., "45/60 images used")
- Graceful error handling with user-friendly messages
- Loading states during operations

## Current Status
- ✅ Database tables created with RLS
- ✅ Storage bucket configured with policies
- ✅ React app initialized with dependencies
- ✅ Tailwind CSS configured
- ⏳ Need to create React components
- ⏳ Need to implement auth flow
- ⏳ Need to implement image upload/display

## Environment Variables Required
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Notes for Development
- Use Supabase's built-in auth helpers for session management
- Leverage react-dropzone for file handling
- Use react-hot-toast for all user notifications
- Keep components small and focused on single responsibilities
- Handle loading and error states in every async operation