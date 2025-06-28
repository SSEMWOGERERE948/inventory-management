# Deployment Guide - Vercel with PostgreSQL

This guide will help you deploy your inventory management system to Vercel with Vercel Postgres.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Vercel CLI** (optional): `npm i -g vercel`

## Step 1: Set up Vercel Postgres

1. **Create a new project on Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Add Vercel Postgres**:
   - In your project dashboard, go to "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose your region (closest to your users)
   - Click "Create"

3. **Get Database URLs**:
   - After creation, go to the "Settings" tab of your database
   - Copy the connection strings:
     - `DATABASE_URL` (for Prisma)
     - `DIRECT_URL` (for migrations)

## Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables:
\`\`\`env
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_postgres_direct_connection_string
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-random-secret-key
\`\`\`

### Generate NEXTAUTH_SECRET:
\`\`\`bash
openssl rand -base64 32
\`\`\`

## Step 3: Update Configuration Files

The following files have been updated for Vercel deployment:

- ✅ `prisma/schema.prisma` - Changed to PostgreSQL
- ✅ `package.json` - Added deployment scripts
- ✅ `next.config.js` - Optimized for Vercel
- ✅ `.env.example` - Template for environment variables

## Step 4: Deploy

### Option A: Automatic Deployment (Recommended)

1. **Push to GitHub**:
   \`\`\`bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   \`\`\`

2. **Vercel will automatically**:
   - Build your application
   - Run `postinstall` script (generates Prisma client)
   - Deploy your app

### Option B: Manual Deployment

1. **Install Vercel CLI**:
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Deploy**:
   \`\`\`bash
   vercel --prod
   \`\`\`

## Step 5: Initialize Database

After deployment, you need to set up your database:

### Option A: Using Vercel Dashboard

1. Go to your project's "Functions" tab
2. Find the API route `/api/setup` (if you create one)
3. Or use the database console in Vercel

### Option B: Local Setup (Recommended)

1. **Set environment variables locally**:
   \`\`\`bash
   cp .env.example .env
   # Fill in your production database URLs
   \`\`\`

2. **Run database setup**:
   \`\`\`bash
   npm run db:push
   npm run db:seed
   \`\`\`

## Step 6: Verify Deployment

1. **Check your deployed app**: `https://your-app-name.vercel.app`
2. **Test login with demo accounts**:
   - Admin: `admin@demo.com` / `password123`
   - Director: `director@demo.com` / `password123`
   - User: `user@demo.com` / `password123`

## Troubleshooting

### Common Issues:

1. **Build Errors**:
   - Check Vercel build logs
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript/ESLint errors

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` and `DIRECT_URL` are correct
   - Check if database is in the same region as your Vercel deployment

3. **Authentication Issues**:
   - Ensure `NEXTAUTH_URL` matches your domain
   - Verify `NEXTAUTH_SECRET` is set
   - Check that cookies are working (secure context)

### Debug Commands:

\`\`\`bash
# Check database connection
npx prisma db pull

# View database in browser
npx prisma studio

# Check build locally
npm run build
\`\`\`

## Production Considerations

1. **Security**:
   - Use strong passwords for demo accounts
   - Enable HTTPS (automatic with Vercel)
   - Set up proper CORS if needed

2. **Performance**:
   - Database is automatically optimized by Vercel
   - Consider adding Redis for caching (Vercel KV)
   - Monitor usage in Vercel dashboard

3. **Monitoring**:
   - Set up error tracking (Sentry, LogRocket)
   - Monitor database performance
   - Set up uptime monitoring

## Scaling

As your app grows:

1. **Database**: Upgrade Vercel Postgres plan
2. **Functions**: Monitor serverless function usage
3. **Storage**: Add Vercel Blob for file uploads
4. **CDN**: Vercel automatically handles this

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Prisma Docs**: [prisma.io/docs](https://prisma.io/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
