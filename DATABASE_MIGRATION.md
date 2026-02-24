# PostgreSQL Database Migration Guide

This guide explains how to migrate from localStorage to PostgreSQL database.

## Overview

The application has been migrated from using browser localStorage to PostgreSQL database with Prisma ORM. This provides:

- **Persistent storage** across devices and browsers
- **Better data integrity** with relational constraints
- **Scalability** for large datasets
- **Data backup** and recovery capabilities
- **Multi-user support** (future)

## Database Setup

### 1. Install Dependencies

All dependencies are already installed:

```bash
npm install
```

### 2. Configure Database

The application uses Prisma Dev (local PostgreSQL) by default. The database is already configured in `.env`:

```env
DATABASE_URL="prisma+postgres://localhost:51213/..."
```

### 3. Start Database

The local PostgreSQL database is already running. If you need to restart it:

```bash
npx prisma dev
```

This will start a local PostgreSQL instance on ports 51213-51215.

### 4. Run Migrations

Migrations have been applied. To verify:

```bash
npm run db:migrate
```

To view your data:

```bash
npm run db:studio
```

## Migration from LocalStorage

If you have existing data in localStorage, you need to migrate it to PostgreSQL.

### Option 1: Browser-Based Migration (Recommended)

1. Start the development server:

```bash
npm run dev
```

2. Navigate to the migration page (you'll need to add this to your app)

3. Click "Start Migration" - this will:
   - Download a backup of your localStorage data
   - Migrate all data to PostgreSQL
   - Preserve all relationships

### Option 2: Script-Based Migration

1. Export your localStorage data:

Open browser console and run:

```javascript
const data = localStorage.getItem("prompt-workbench-data");
console.log(data);
```

2. Copy the output and save it to `scripts/localstorage-backup.json`

3. Run the migration script:

```bash
node scripts/migrate-localstorage-to-db.js
```

4. Verify the migration:

```bash
npm run db:studio
```

## Database Schema

The database has 8 main tables:

- **Project** - Top-level projects
- **SpecVersion** - Versioned specifications
- **DatasetCase** - Test dataset cases
- **Prompt** - Generated or manual prompts
- **EvalDefinition** - Evaluation criteria
- **Run** - Execution runs
- **RunResult** - Results of each run
- **EvalResult** - Evaluation scores

All tables are connected with foreign keys, and deleting a project will cascade delete all related data.

## API Endpoints

All data operations now go through API endpoints at `/api/data/`:

### Projects

- `GET /api/data/projects` - List all projects
- `POST /api/data/projects` - Create project
- `PATCH /api/data/projects/[id]` - Update project
- `DELETE /api/data/projects/[id]` - Delete project (cascade)

### Spec Versions

- `GET /api/data/spec-versions?projectId=xxx` - List spec versions
- `POST /api/data/spec-versions` - Create spec version
- `PATCH /api/data/spec-versions/[id]` - Update spec version
- `DELETE /api/data/spec-versions/[id]` - Delete spec version

### Dataset Cases

- `GET /api/data/dataset-cases?projectId=xxx` - List dataset cases
- `POST /api/data/dataset-cases` - Create dataset cases (batch)
- `PATCH /api/data/dataset-cases/[id]` - Update dataset case
- `DELETE /api/data/dataset-cases/[id]` - Delete dataset case

### Prompts

- `GET /api/data/prompts?projectId=xxx` - List prompts
- `POST /api/data/prompts` - Create prompt
- `PATCH /api/data/prompts/[id]` - Update prompt
- `DELETE /api/data/prompts/[id]` - Delete prompt

### Eval Definitions

- `GET /api/data/eval-definitions?projectId=xxx` - List eval definitions
- `POST /api/data/eval-definitions` - Create eval definition
- `PATCH /api/data/eval-definitions/[id]` - Update eval definition
- `DELETE /api/data/eval-definitions/[id]` - Delete eval definition

### Runs

- `GET /api/data/runs?projectId=xxx` - List runs
- `POST /api/data/runs` - Create run
- `PATCH /api/data/runs/[id]` - Update run
- `DELETE /api/data/runs/[id]` - Delete run

### Run Results

- `GET /api/data/run-results?runId=xxx` - List run results
- `POST /api/data/run-results` - Create run results (batch)
- `PATCH /api/data/run-results/[id]` - Update run result
- `DELETE /api/data/run-results/[id]` - Delete run result

### Eval Results

- `GET /api/data/eval-results?runResultId=xxx` - List eval results
- `GET /api/data/eval-results?runId=xxx` - List eval results for run
- `POST /api/data/eval-results` - Create eval results (batch)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub

2. Connect to Vercel

3. Add Vercel Postgres:

```bash
vercel postgres create
```

4. Link to your project:

```bash
vercel env pull
```

5. Deploy:

```bash
vercel deploy
```

### Other Platforms

Set the `DATABASE_URL` environment variable to your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

Then run migrations:

```bash
npx prisma migrate deploy
```

## Backup and Recovery

### Create Backup

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore Backup

```bash
psql $DATABASE_URL < backup.sql
```

### Export Data

Use Prisma Studio to export data:

```bash
npm run db:studio
```

## Troubleshooting

### Database Connection Issues

Check if the database is running:

```bash
npx prisma dev
```

### Migration Errors

Reset the database (WARNING: destroys all data):

```bash
npx prisma migrate reset
```

### Data Validation Errors

Check Prisma Studio for data integrity:

```bash
npm run db:studio
```

## Development

### Schema Changes

1. Edit `prisma/schema.prisma`

2. Create migration:

```bash
npm run db:migrate
```

3. Generate Prisma Client:

```bash
npm run db:generate
```

### Adding Indexes

For better query performance, add indexes in `schema.prisma`:

```prisma
model Project {
  id   String @id
  name String
  
  @@index([name])
}
```

## Performance Considerations

- The initial data load fetches all projects and their related data
- For large datasets (>1000 records), consider implementing pagination
- Database queries are optimized with indexes on foreign keys
- Connection pooling is handled automatically by Prisma

## Security

- Database credentials are stored in `.env` (not committed to git)
- API endpoints validate all input data
- Prisma Client escapes all SQL queries (prevents SQL injection)
- Foreign key constraints ensure data integrity
