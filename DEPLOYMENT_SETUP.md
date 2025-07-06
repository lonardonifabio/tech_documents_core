# Free GitHub Pages Deployment Setup Guide

This guide explains how to complete the setup for the free GitHub Pages deployment from your private repository to your public repository.

## 🎯 Overview

**Architecture**: Private repo (code) → Build → Deploy to Public repo (main) → Free GitHub Pages hosting

**Cost**: $0/month (no GitHub Pro needed!)

## ✅ Completed Steps

1. ✅ Private repository setup with source code
2. ✅ Modified deployment workflow to use free GitHub Pages
3. ✅ Configured cross-repository deployment
4. ✅ Created custom workflow for restricted Actions environments

## ⚠️ GitHub Actions Restriction Fix

If you get an error about actions not being allowed, you have two options:

### Option A: Enable Third-Party Actions (Recommended)
1. Go to your private repository: https://github.com/lonardonifabio/tech_documents_core
2. Settings → Actions → General
3. Under "Actions permissions", select **"Allow all actions and reusable workflows"**
4. Save and use the original `deploy.yml` workflow

### Option B: Use Custom Workflow (No Third-Party Actions)
Use the `deploy-custom.yml` workflow which only uses built-in commands and doesn't require third-party actions.

## 🔧 Required Setup Steps

### Step 1: Enable GitHub Pages on Public Repository

1. Go to your **public repository**: https://github.com/lonardonifabio/tech_documents
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch
6. Click **Save**

### Step 2: Add Trigger Workflow to Public Repository

Add this file to your public repository at `.github/workflows/trigger-private-repo.yml`:

```yaml
name: Trigger Private Repository Update

on:
  push:
    paths:
      - 'documents/**'
      - 'data/**'
  workflow_dispatch:

jobs:
  trigger-private-repo:
    runs-on: ubuntu-latest
    
    steps:
      - name: Trigger private repository workflow
        uses: peter-evans/repository-dispatch@v2
        with:
          token: ${{ secrets.PRIVATE_REPO_PAT }}
          repository: lonardonifabio/tech_documents_core
          event-type: documents-updated
          client-payload: |
            {
              "ref": "${{ github.ref }}",
              "sha": "${{ github.sha }}",
              "repository": "${{ github.repository }}",
              "pusher": "${{ github.actor }}",
              "timestamp": "${{ github.event.head_commit.timestamp }}"
            }

      - name: Workflow Summary
        run: |
          echo "🔄 Triggered private repository update"
          echo "📁 Repository: lonardonifabio/tech_documents_core"
          echo "🎯 Event: documents-updated"
          echo "📊 Commit: ${{ github.sha }}"
          echo "👤 Triggered by: ${{ github.actor }}"
```

### Step 3: Clean Up Public Repository (Optional)

To complete the migration, you can remove source code from the public repository:

**Keep only:**
- `documents/` folder
- `data/` folder
- `README.md` (update to explain new structure)
- `.github/workflows/trigger-private-repo.yml`

**Remove:**
- `src/` folder
- `public/` folder (except what's needed for documents)
- `scripts/` folder
- Configuration files (`package.json`, `astro.config.mjs`, etc.)

## 🚀 Testing the Setup

1. **Manual Test**: Go to your private repository → Actions → Run "Build and Deploy to Public Repo (Free)"
2. **Automatic Test**: Upload a document to your public repository
3. **Verify**: Check that the site builds and deploys to https://lonardonifabio.github.io/tech_documents/

## 🔍 Troubleshooting

### If deployment fails:
1. Check that `PRIVATE_REPO_PAT` secret exists in both repositories
2. Verify GitHub Pages is enabled on public repository
3. Check Actions logs for specific error messages

### If trigger doesn't work:
1. Ensure the trigger workflow file is in the public repository
2. Verify the PAT token has `workflow` permissions
3. Check that the file paths in the trigger match your document structure

## 💰 Cost Savings

- **Before**: GitHub Pro required ($4/month) for private repo GitHub Pages
- **After**: $0/month using public repo GitHub Pages
- **Savings**: $48/year while maintaining full functionality!

## 🎉 Benefits

✅ **Zero cost** - No GitHub Pro subscription needed
✅ **Same URL** - https://lonardonifabio.github.io/tech_documents/
✅ **Private code** - Source code stays protected in private repository
✅ **Automated** - Same workflow triggers and deployment process
✅ **Full functionality** - All features maintained

Your migration to a cost-effective private code + public documents architecture is complete!
