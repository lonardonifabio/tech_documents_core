# GitHub Secrets Setup Guide

## 🔑 Required Secrets Configuration

Both workflows are failing because the `PRIVATE_REPO_PAT` secret needs to be properly configured with the right permissions.

## 📋 Step-by-Step Secret Setup

### 1. Create a New Personal Access Token (PAT)

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set these permissions:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **workflow** (Update GitHub Action workflows)
   - ✅ **write:packages** (Upload packages to GitHub Package Registry)
   - ✅ **delete:packages** (Delete packages from GitHub Package Registry)

### 2. Add Secret to Private Repository

1. Go to your **private repository**: https://github.com/lonardonifabio/tech_documents_core
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `PRIVATE_REPO_PAT`
5. Value: Paste your PAT token
6. Click "Add secret"

### 3. Add Secret to Public Repository

1. Go to your **public repository**: https://github.com/lonardonifabio/tech_documents
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `PRIVATE_REPO_PAT`
5. Value: Paste the same PAT token
6. Click "Add secret"

## ⚠️ Important Notes

- The token must have **repo** and **workflow** permissions
- Add the same token to **both repositories**
- The token name must be exactly `PRIVATE_REPO_PAT`
- Make sure the token hasn't expired

## 🧪 Test the Setup

After adding the secrets:
1. Go to private repository → Actions
2. Run "Build and Deploy to Public Repo (Free)" workflow
3. Check that it completes without authentication errors

## 🔍 Troubleshooting

If you still get authentication errors:
1. Verify the token has the correct permissions
2. Check that the token hasn't expired
3. Ensure the secret name is exactly `PRIVATE_REPO_PAT`
4. Try regenerating the token if needed
