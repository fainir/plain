# Supabase Migration Guide

## Step-by-Step Instructions

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Sign in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `plain-app`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., US West, EU West)
   - **Pricing Plan**: Free tier
5. Click **"Create new project"**
6. Wait 2-3 minutes for provisioning

### 2. Get Your Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** tab
3. Copy these values (you'll need them in step 4):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - KEEP THIS SECRET!

### 3. Run Database Setup Script

1. In Supabase Dashboard, go to **SQL Editor** (sidebar)
2. Click **"New query"**
3. Open the file `supabase-setup.sql` in this repo
4. Copy all contents and paste into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

### 4. Enable Authentication Providers

#### Enable Email/Password Auth:
1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Find **Email** provider
3. Toggle **Enable Email provider** to ON
4. **Confirm email**: Toggle ON (recommended for production)
5. Click **Save**

#### Enable Google OAuth:
1. Still in **Authentication** → **Providers**
2. Find **Google** provider
3. Toggle **Enable Google provider** to ON
4. You'll need Google OAuth credentials:

   **Get Google OAuth Credentials:**
   1. Go to https://console.cloud.google.com/
   2. Create a new project or select existing
   3. Go to **APIs & Services** → **Credentials**
   4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
   5. Configure consent screen if needed
   6. Application type: **Web application**
   7. Add authorized redirect URI:
      ```
      https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
      ```
      (Replace YOUR_SUPABASE_PROJECT_REF with your actual ref from step 2)
   8. Copy **Client ID** and **Client Secret**

5. Back in Supabase, paste:
   - **Google Client ID**
   - **Google Client Secret**
6. Click **Save**

### 5. Set Up Environment Variables

#### Backend (.env):
Create `backend/.env`:
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_KEY=eyJ...your-service-key...

# Keep existing vars
ANTHROPIC_API_KEY=your-anthropic-key
```

#### Frontend (.env.local):
Create `frontend/.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# OAuth Redirect (use your actual domain)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Install Dependencies

#### Backend:
```bash
cd backend
pip install supabase python-dotenv
```

#### Frontend:
```bash
cd frontend
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 7. Migrate Existing Data (Optional)

If you have existing JSON data you want to migrate:
```bash
cd backend
python migrate_json_to_supabase.py
```

This will:
- Create a default workspace
- Import your schema
- Import all table data
- Import categories

### 8. Test Authentication

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Go to http://localhost:3000
3. You should see a login page
4. Try signing up with email
5. Check your email for confirmation link
6. Try signing in with Google

### 9. Verify Everything Works

1. Create a new workspace
2. Add some data to a table
3. Check Supabase Dashboard → **Table Editor** to see your data
4. Try the category filter
5. Test workspace switching

## Troubleshooting

### "Invalid API key"
- Check your `.env` files have correct values
- Make sure you copied the full key (they're very long!)
- Restart both servers after changing `.env`

### Google OAuth not working
- Verify redirect URI in Google Console matches Supabase exactly
- Check Google OAuth credentials are pasted correctly in Supabase
- Make sure Google provider is enabled in Supabase

### "Row Level Security" errors
- Make sure you ran the full `supabase-setup.sql` script
- Check RLS policies are enabled in Supabase Dashboard → **Authentication** → **Policies**

### Data not showing up
- Check you're logged in (check browser console)
- Verify workspace membership in **Table Editor** → `workspace_members`
- Check RLS policies allow your user to access data

## Next Steps

After successful migration:
1. ✅ Remove old JSON file-based code
2. ✅ Update README with new setup instructions
3. ✅ Test multi-user collaboration
4. ✅ Deploy to production (Vercel for frontend, your choice for backend)
5. ✅ Set up production environment variables

## Support

If you run into issues:
1. Check Supabase logs: **Dashboard** → **Logs** → **Postgres Logs**
2. Check browser console for errors
3. Check backend logs for Python errors
4. Read Supabase docs: https://supabase.com/docs
