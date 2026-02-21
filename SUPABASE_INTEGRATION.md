# Supabase Integration Guide

## Overview
The website has been successfully integrated with the same Supabase backend used by the mobile app.

## Configuration

### Environment Variables
- `VITE_SUPABASE_URL`: https://yfcxivpkfyljsvcpztrl.supabase.co
- `VITE_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmY3hpdnBrZnlsanN2Y3B6dHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Njg1ODgsImV4cCI6MjA4NzE0NDU4OH0.6nX6hKXwLxFyh0g4ynQQpzsTaL4LO89UudHT995fL5U

### Files Added/Modified
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/supabaseService.ts` - Service layer for Supabase operations
- `src/contexts/AuthContext.tsx` - Authentication context
- `src/App.tsx` - Updated to use Supabase data
- `.env` - Environment variables

## Shared Database Schema

### Tables
- `users` - User profiles and authentication
- `projects` - Carbon credit projects
- `documents` - Project documentation
- `transactions` - Credit transactions
- `evidence` - Project evidence files

### Storage Buckets
- `projects` - Project-related files
- `evidence` - Evidence documentation
- `documents` - General documents

## Features Enabled

### Authentication
- Shared user authentication between mobile and web
- Sign up, sign in, sign out functionality
- User session management

### Real-time Data
- Live project updates
- Real-time dashboard statistics
- Automatic data synchronization

### File Storage
- Shared file uploads between platforms
- Public URL generation for documents
- Consistent file organization

## Data Mapping

### Website Mock Data → Supabase Schema
- `Project.id` → `projects.id`
- `Project.accountId` → `projects.user_id`
- `Project.creditsIssued` → `projects.additional_data.creditsIssued`
- `Project.metadata` → `projects.additional_data` + `projects.documents`

## Usage

### Authentication
```typescript
import { useAuth } from './contexts/AuthContext'

const { user, signIn, signUp, signOut } = useAuth()
```

### Data Operations
```typescript
import { SupabaseService } from './lib/supabaseService'

// Get projects
const projects = await SupabaseService.getProjects()

// Create project
const project = await SupabaseService.createProject(projectData)

// Get dashboard stats
const stats = await SupabaseService.getDashboardStats()
```

## Migration Notes

1. **Backward Compatibility**: Mock data is preserved as fallback
2. **Gradual Migration**: Website can run with mixed data sources
3. **No Breaking Changes**: Existing functionality remains intact
4. **Real-time Updates**: Automatic synchronization with mobile app

## Next Steps

1. Test authentication flow
2. Verify real-time data synchronization
3. Test file upload functionality
4. Validate data consistency between platforms
