#!/usr/bin/env node
/**
 * Migration script to transfer data from localStorage to PostgreSQL
 * 
 * Usage:
 *   node scripts/migrate-localstorage-to-db.js
 * 
 * This script:
 * 1. Reads data from localStorage backup file
 * 2. Validates the data structure
 * 3. Inserts data into PostgreSQL via API endpoints
 * 4. Creates a backup of the original data
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'prompt-workbench-data';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`  → ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} ${error}`);
  }

  return response.json();
}

async function migrateProject(project, relatedData) {
  console.log(`\n📦 Migrating project: "${project.name}" (${project.id})`);

  // Create project
  const createdProject = await fetchAPI('/api/data/projects', {
    method: 'POST',
    body: JSON.stringify({ name: project.name }),
  });
  console.log(`  ✓ Project created`);

  // Migrate spec versions
  const projectSpecs = relatedData.specVersions.filter(s => s.projectId === project.id);
  for (const spec of projectSpecs) {
    await fetchAPI('/api/data/spec-versions', {
      method: 'POST',
      body: JSON.stringify({
        projectId: createdProject.id,
        content: spec.content,
        freeformText: spec.freeformText,
      }),
    });
  }
  if (projectSpecs.length > 0) {
    console.log(`  ✓ ${projectSpecs.length} spec version(s) created`);
  }

  // Migrate dataset cases
  const projectCases = relatedData.datasetCases.filter(d => d.projectId === project.id);
  if (projectCases.length > 0) {
    const casesForAPI = projectCases.map(c => ({
      id: c.id,
      projectId: createdProject.id,
      input: c.input,
      expectedOutput: c.expectedOutput,
      labels: c.labels,
      createdFromSpecVersion: c.createdFromSpecVersion,
      source: c.source,
      createdAt: c.createdAt,
    }));
    await fetchAPI('/api/data/dataset-cases', {
      method: 'POST',
      body: JSON.stringify({ cases: casesForAPI }),
    });
    console.log(`  ✓ ${projectCases.length} dataset case(s) created`);
  }

  // Migrate prompts
  const projectPrompts = relatedData.prompts.filter(p => p.projectId === project.id);
  for (const prompt of projectPrompts) {
    await fetchAPI('/api/data/prompts', {
      method: 'POST',
      body: JSON.stringify({
        id: prompt.id,
        projectId: createdProject.id,
        specVersion: prompt.specVersion,
        name: prompt.name,
        content: prompt.content,
        createdAt: prompt.createdAt,
      }),
    });
  }
  if (projectPrompts.length > 0) {
    console.log(`  ✓ ${projectPrompts.length} prompt(s) created`);
  }

  // Migrate eval definitions
  const projectEvals = relatedData.evalDefinitions.filter(e => e.projectId === project.id);
  for (const evalDef of projectEvals) {
    await fetchAPI('/api/data/eval-definitions', {
      method: 'POST',
      body: JSON.stringify({
        id: evalDef.id,
        projectId: createdProject.id,
        specVersion: evalDef.specVersion,
        name: evalDef.name,
        description: evalDef.description,
        scoreMode: evalDef.scoreMode,
        judgeInstruction: evalDef.judgeInstruction,
        createdAt: evalDef.createdAt,
      }),
    });
  }
  if (projectEvals.length > 0) {
    console.log(`  ✓ ${projectEvals.length} eval definition(s) created`);
  }

  // Migrate runs
  const projectRuns = relatedData.runs.filter(r => r.projectId === project.id);
  for (const run of projectRuns) {
    await fetchAPI('/api/data/runs', {
      method: 'POST',
      body: JSON.stringify({
        id: run.id,
        projectId: createdProject.id,
        promptId: run.promptId,
        datasetCaseIds: run.datasetCaseIds,
        evalIds: run.evalIds,
        specVersion: run.specVersion,
        status: run.status,
        label: run.label,
        createdAt: run.createdAt,
      }),
    });

    // Migrate run results
    const runResults = relatedData.runResults.filter(rr => rr.runId === run.id);
    if (runResults.length > 0) {
      const resultsForAPI = runResults.map(rr => ({
        id: rr.id,
        runId: run.id,
        datasetCaseId: rr.datasetCaseId,
        output: rr.output,
        labels: rr.labels,
        createdAt: rr.createdAt,
      }));
      await fetchAPI('/api/data/run-results', {
        method: 'POST',
        body: JSON.stringify({ results: resultsForAPI }),
      });

      // Migrate eval results
      const evalResults = relatedData.evalResults.filter(er =>
        runResults.some(rr => rr.id === er.runResultId)
      );
      if (evalResults.length > 0) {
        const evalResultsForAPI = evalResults.map(er => ({
          id: er.id,
          runResultId: er.runResultId,
          evalId: er.evalId,
          score: er.score,
          reason: er.reason,
          createdAt: er.createdAt,
        }));
        await fetchAPI('/api/data/eval-results', {
          method: 'POST',
          body: JSON.stringify({ results: evalResultsForAPI }),
        });
      }
    }
  }
  if (projectRuns.length > 0) {
    console.log(`  ✓ ${projectRuns.length} run(s) with results created`);
  }
}

async function main() {
  console.log('🚀 LocalStorage to PostgreSQL Migration Tool\n');
  console.log('This script will migrate your data from localStorage to PostgreSQL.');
  console.log('Make sure the database is running and the Next.js dev server is active.\n');

  // Check if backup file exists
  const backupPath = path.join(__dirname, 'localstorage-backup.json');
  
  let data;
  if (fs.existsSync(backupPath)) {
    console.log('📂 Reading data from backup file...');
    data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } else {
    console.log('❌ Backup file not found at:', backupPath);
    console.log('\nTo create a backup, run this in your browser console:');
    console.log('  localStorage.getItem("prompt-workbench-data")');
    console.log('\nThen save the output to scripts/localstorage-backup.json');
    process.exit(1);
  }

  // Validate data structure
  if (!data.projects || !Array.isArray(data.projects)) {
    console.log('❌ Invalid data structure. Expected { projects: [...], ... }');
    process.exit(1);
  }

  console.log(`\n📊 Found ${data.projects.length} project(s) to migrate`);
  console.log(`   - ${data.specVersions?.length || 0} spec versions`);
  console.log(`   - ${data.datasetCases?.length || 0} dataset cases`);
  console.log(`   - ${data.prompts?.length || 0} prompts`);
  console.log(`   - ${data.evalDefinitions?.length || 0} eval definitions`);
  console.log(`   - ${data.runs?.length || 0} runs`);

  // Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(__dirname, `localstorage-backup-${timestamp}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Created backup at: ${archivePath}`);

  // Start migration
  console.log('\n🔄 Starting migration...');
  
  try {
    for (const project of data.projects) {
      await migrateProject(project, data);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Verify your data in the application');
    console.log('  2. Check Prisma Studio: npm run db:studio');
    console.log('  3. If everything looks good, you can remove the localStorage data');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nThe database may be in an inconsistent state.');
    console.error('You may need to reset it and try again.');
    process.exit(1);
  }
}

main().catch(console.error);
