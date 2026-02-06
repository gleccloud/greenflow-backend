# LocalStack Quick Start Guide

**GreenFlow Frontend Deployment to LocalStack S3**

---

## ⚡ 30-Second Setup

```bash
# 1. Install LocalStack CLI
brew install localstack/tap/localstack-cli

# 2. Start LocalStack (if not already running)
localstack start

# 3. Configure AWS CLI
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[profile localstack]
region = us-east-1
EOF
cat > ~/.aws/credentials << 'EOF'
[localstack]
aws_access_key_id = test
aws_secret_access_key = test
EOF
```

---

## 🚀 Deploy Frontend in 1 Minute

```bash
# 1. Create S3 bucket
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3 mb s3://greenflow-frontend

# 2. Enable static website hosting
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3api put-bucket-website --bucket greenflow-frontend \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'

# 3. Set public access policy
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3api put-bucket-policy --bucket greenflow-frontend \
  --policy '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":"*",
      "Action":"s3:GetObject",
      "Resource":"arn:aws:s3:::greenflow-frontend/*"
    }]
  }'

# 4. Upload frontend build
cd /projects/green-logistics-landing/dist
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3 sync . s3://greenflow-frontend/

# ✅ Done! Your app is live at:
# http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/
```

---

## 📍 Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/ |
| LocalStack Console | http://localhost:4566/ |
| AWS CLI Endpoint | `--endpoint-url=http://localhost:4566` |

---

## 🔄 Common Commands

```bash
# List all S3 buckets
aws --profile localstack --endpoint-url=http://localhost:4566 s3 ls

# List bucket contents
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-frontend/ --recursive

# Upload files
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3 cp index.html s3://greenflow-frontend/

# Delete bucket
aws --profile localstack --endpoint-url=http://localhost:4566 \
  s3 rb s3://greenflow-frontend --force

# Test connectivity
curl -v http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/
```

---

## 🔧 Alias for Easier Commands

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias awsl="aws --profile localstack --endpoint-url=http://localhost:4566"

# Usage:
awsl s3 ls
awsl s3 sync dist/ s3://greenflow-frontend/
```

---

## ✅ Verify Deployment

```bash
# 1. Check if files uploaded
awsl s3 ls s3://greenflow-frontend/ --recursive

# 2. Test endpoint
curl -I http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/

# 3. Open in browser
open http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 4566 in use | `docker stop greenflow-localstack` |
| Credentials error | Check `~/.aws/credentials` |
| 404 on website | Verify `index.html` exists: `awsl s3 ls s3://greenflow-frontend/index.html` |
| Assets not loading | Re-sync: `awsl s3 sync dist/assets/ s3://greenflow-frontend/assets/` |
| Connection refused | Verify LocalStack running: `docker ps \| grep localstack` |

---

## 📊 Current Status

✅ Frontend Deployed
- Build: 2.3 MB (621 KB gzip)
- Endpoint: http://greenflow-frontend.s3-website.localhost.localstack.cloud:4566/
- Status: HTTP 200, all assets loading

---

## 📚 Full Documentation

See [LOCALSTACK_DEPLOYMENT.md](./LOCALSTACK_DEPLOYMENT.md) for detailed guide.

---

**Last Updated**: 2026-02-05
