# Vercel Deployment Guide

## Prerequisites

- Vercel account
- Vercel CLI installed: `npm i -g vercel`
- Git repository connected to Vercel

## Step-by-Step Deployment

### 1. Create Vercel Postgres Database

```bash
# Login to Vercel
vercel login

# Navigate to your project
cd /Users/tanya/JustAnswer/promptEngineeringWorkbench

# Link your project (if not already linked)
vercel link

# Create Postgres database
vercel postgres create
```

Follow the prompts:
- Database name: `promptworkbench-db` (or your choice)
- Region: Choose closest to your users
- Link to project: Select your project

### 2. Environment Variables

Vercel automatically adds `DATABASE_URL` to your project after creating the database.

**Verify in Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Confirm `DATABASE_URL` exists

**Add OpenAI API Key:**
1. In the same Environment Variables section
2. Click "Add New"
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key
5. Select all environments (Production, Preview, Development)
6. Click "Save"

### 3. Deploy

```bash
# Option 1: Deploy via Git (Recommended)
git add .
git commit -m "Add PostgreSQL support"
git push

# Option 2: Deploy via CLI
vercel --prod
```

### 4. Verify Deployment

1. **Check build logs** in Vercel dashboard
2. **Visit your production URL**
3. **Test creating a project** to verify database connection
4. **Check database** in Vercel dashboard → Storage → Your Postgres database

## Build Process

The `build` script in `package.json` now runs:

```bash
prisma generate    # Generate Prisma Client
prisma db push     # Create/update database tables
next build         # Build Next.js app
```

## Troubleshooting

### Build Fails: "Can't reach database"

**Solution:** Check `DATABASE_URL` environment variable is set in Vercel.

```bash
# Verify locally
vercel env pull
cat .env.local  # Check if DATABASE_URL exists
```

### Database Tables Not Created

**Solution:** The `prisma db push` in build script creates tables. Check build logs.

### "Prisma Client not generated"

**Solution:** The `postinstall` script should handle this. If not:

```bash
# Redeploy with force
vercel --prod --force
```

### Different Behavior in Production

**Issue:** Works locally but not in production.

**Check:**
1. Environment variables are set for Production environment
2. Database is in the same region as your Vercel deployment
3. Check Vercel function logs for errors

## Monitoring

### View Database Data

1. Go to Vercel dashboard
2. Storage → Your Postgres database
3. Click "Browse Data" or use connection string with any SQL client

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Recent logs
vercel logs
```

### Database Usage

1. Vercel dashboard → Storage → Your database
2. View storage usage, connections, queries

## Vercel Postgres Limits (Free Tier)

- **Storage:** 256 MB
- **Compute:** 60 hours per month
- **Data transfer:** 256 MB per month

If you exceed these, consider:
- Vercel Pro plan ($20/month)
- External database (Supabase, Neon, Railway)

## Connecting External Tools

Get your connection string:

```bash
# From Vercel CLI
vercel env pull
cat .env.local | grep DATABASE_URL

# Or from Vercel Dashboard
# Storage → Your database → Connection String
```

Use this to connect:
- DataGrip
- Prisma Studio
- Other database tools

## Migration vs Push

**Current setup uses `prisma db push`** (schema sync without migrations).

**For production with team, use migrations:**

```bash
# Create migration
npx prisma migrate dev --name init

# Update package.json build script:
"build": "prisma generate && prisma migrate deploy && next build"
```

## Rollback

If deployment fails and you need to rollback:

```bash
# Via CLI
vercel rollback

# Or in dashboard
# Deployments → Previous deployment → Promote to Production
```

## Best Practices

1. **Test locally first** with production env vars:
   ```bash
   vercel env pull
   npm run build
   npm start
   ```

2. **Use Preview deployments** for testing:
   - Create a branch
   - Push changes
   - Vercel creates preview deployment
   - Test before merging to main

3. **Monitor database size** - Free tier is 256 MB

4. **Backup your data** regularly:
   ```bash
   # Connect and export
   pg_dump $DATABASE_URL > backup.sql
   ```

## Success Checklist

✅ Vercel Postgres database created  
✅ DATABASE_URL environment variable set  
✅ OPENAI_API_KEY environment variable set  
✅ Build script includes Prisma commands  
✅ Deployment successful  
✅ Database tables created  
✅ App accessible at production URL  
✅ Can create/read projects  

## Support

- Vercel Docs: https://vercel.com/docs/storage/vercel-postgres
- Prisma Docs: https://www.prisma.io/docs
- Issues: Check Vercel build logs and function logs
