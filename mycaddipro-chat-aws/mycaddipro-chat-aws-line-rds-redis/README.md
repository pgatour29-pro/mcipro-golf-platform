# Vendor-like Chat Feature Pack (Self-Hosted)

Core features similar to managed chat vendors, but fully under your control:

- Channels, messages, presence, typing indicators
- Read receipts
- Attachments (pre-sign stub; plug S3)
- Webhooks (replay; add signing/retries)
- JWT/OIDC auth scaffold (LINE-compatible)
- Next.js sample client with IndexedDB outbox
- Postgres schema, Redis, SQS (via LocalStack) for local dev

## Local Quickstart
```bash
docker compose -f infra/docker-compose.yml up -d
# Term 1
cd backend/chat-api && npm i && npm run start:dev
# Term 2
cd backend/chat-realtime && npm i && npm run start
# Term 3
cd backend/fanout-worker && npm i && npm run start
# Term 4
cd frontend && npm i && npm run dev
# Open http://localhost:3000
```

---

## AWS Tailoring Notes

- **Region:** ap-southeast-1 by default.
- **S3 Presign:** `/v1/attachments/presign` returns a URL you can `PUT` to directly. Set `S3_BUCKET` env and IAM role with `s3:PutObject` on that bucket.
- **Rate limits:** configurable with `RATE_LIMIT_RPS` and `RATE_LIMIT_BURST` (token bucket, per-user `sub` from OIDC).
- **Auth:** wire LINE Login (OIDC). Backend validates tokens via JWKS; frontend has a login link stub.
- **Infra:** Terraform `infra/main.tf` provisions S3 and SQS. Add RDS/ElastiCache modules or use existing clusters.
- **Local dev:** docker-compose brings up Postgres/Redis/LocalStack SQS; S3 presign will also work if you point the SDK to real AWS or run LocalStack S3.


---

## Deploying on AWS (RDS + ElastiCache)

1. **Provision base infra** (S3, SQS, ECR, RDS, Redis):
   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars
   # fill VPC + subnet IDs + db_password
   terraform init
   terraform apply
   ```

2. **Wire app envs** using Terraform outputs:
   - `PG_URL=postgres://<db_username>:<db_password>@${rds_endpoint}:5432/chatdb`
   - `REDIS_URL=redis://:${your_redis_auth_optional}@${redis_endpoint}:6379`
   - `SQS_URL=${sqs_queue_url}`
   - `S3_BUCKET=${s3_bucket}`
   - `AWS_REGION=${region}`

3. **Build & push images to ECR** (see `.github/workflows/ecr_build.yml`).

4. **Run on ECS or your platform of choice**:
   - 1 task for `chat-api` (CPU 0.25–0.5 vCPU, 512–1024MB)
   - 1 task for `chat-realtime` (similar)
   - 1 task for `fanout-worker` (tiny, can be spot)
   - Security groups: allow ECS tasks to reach RDS (5432), Redis (6379), SQS, and S3.

5. **DNS & TLS**:
   - Point `chat.mycaddipro.com` to your frontend (CloudFront/ALB)
   - Backend endpoints behind ALB with ACM TLS certs.
