# Deploying Feastory on AWS (with MongoDB Atlas)

Two ways, pick one:

| | **Option A – Single EC2 (simplest)** | **Option B – Managed / production** |
|---|---|---|
| Frontend | nginx in Docker on the EC2 | **S3 + CloudFront** |
| Backend | FastAPI in Docker on the EC2 | **App Runner** (or ECS Fargate) |
| Database | **MongoDB Atlas** (free M0, hosted in AWS ap-south-1) | **MongoDB Atlas** |
| Dish images | **S3** | **S3** (+ CloudFront) |
| Cost (free tier) | ₹0 first year on t3.micro; Atlas M0 is free forever | App Runner ≈ $5–10/mo idle |
| Good for | college demo, viva, first deployment | resume-grade, scales, HTTPS out of the box |

Both options share steps 1–3. Region used below: **ap-south-1 (Mumbai)**.

---

## 0. Prerequisites (once)

1. AWS account → create an **IAM user** with `AdministratorAccess` (fine for a personal project), download the access key.
2. Install and configure the CLI on your laptop:
   ```bash
   aws configure          # paste access key, secret, region ap-south-1, output json
   ```
3. Push this repo to GitHub (App Runner pulls from it).

---

## 1. Database — MongoDB Atlas (online, free)

1. Sign up at https://cloud.mongodb.com → **Create a cluster** → **M0 Free** → Provider **AWS**, Region **Mumbai (ap-south-1)** (same region as your EC2/App Runner = lowest latency) → name `feastory` → Create.
2. **Security → Database Access → Add New Database User**
   - Username `feastory_app`, password: click *Autogenerate* and **save it**
   - Role: *Read and write to any database* (or `readWrite` on `feastory`)
3. **Security → Network Access → Add IP Address**
   - For a first deploy: **Allow access from anywhere** (`0.0.0.0/0`). The user/password still protects the cluster.
   - Tighter later: add only your EC2 **Elastic IP** (Option A) or use a NAT gateway's IP (Option B).
4. **Connect → Drivers → Python** → copy the connection string. It looks like:
   ```
   mongodb+srv://feastory_app:<PASSWORD>@feastory.abc12.mongodb.net/?retryWrites=true&w=majority&appName=feastory
   ```
   Replace `<PASSWORD>`. If the password has special characters, URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

That is your `MONGO_URL`. The database `feastory` and all collections/indexes are created automatically the first time the API starts, and demo dishes + the manager account are seeded. `backend/db/collections.md` documents every collection for your DBMS report.

Verify from your laptop before deploying anything:
```bash
cd backend
MONGO_URL="mongodb+srv://…" python -c "from app.db import connect; print(connect().list_collection_names())"
```
(Empty list = connected fine, nothing seeded yet.)

---

## 2. Dish images — S3 bucket

```bash
aws s3 mb s3://feastory-dish-images --region ap-south-1

# Allow public READ of objects (menu images are public anyway)
aws s3api put-public-access-block --bucket feastory-dish-images \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

cat > /tmp/policy.json <<'EOF'
{ "Version": "2012-10-17",
  "Statement": [{ "Sid": "PublicRead", "Effect": "Allow", "Principal": "*",
                  "Action": "s3:GetObject", "Resource": "arn:aws:s3:::feastory-dish-images/*" }] }
EOF
aws s3api put-bucket-policy --bucket feastory-dish-images --policy file:///tmp/policy.json
```

The backend needs **write** permission. Create an IAM policy `FeastoryS3Write`:

```json
{ "Version": "2012-10-17",
  "Statement": [{ "Effect": "Allow", "Action": ["s3:PutObject","s3:PutObjectAcl"],
                  "Resource": "arn:aws:s3:::feastory-dish-images/*" }] }
```

Attach it to the **EC2 instance role** (Option A) or the **App Runner instance role** (Option B). No access keys in code.

Backend env for S3 mode:
```
STORAGE_BACKEND=s3
S3_BUCKET=feastory-dish-images
AWS_REGION=ap-south-1
```

---

## 3. Secrets

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"   # → JWT_SECRET
```

---

## Option A — Single EC2 with Docker Compose

### A1. Launch the instance
Console → **EC2 → Launch instance**
- Name `feastory`, AMI **Ubuntu 24.04**, type **t3.micro** (free tier)
- Key pair: create/download `feastory.pem`
- Security group `feastory-web-sg`: allow **SSH 22** (My IP), **HTTP 80** (Anywhere), **HTTPS 443** (Anywhere)
- Advanced → IAM instance profile: role `feastory-ec2-role` with the `FeastoryS3Write` policy
- Launch. Then **EC2 → Elastic IPs → Allocate → Associate** with the instance (so the IP survives restarts and you can allow-list it in Atlas).

### A2. Install Docker and deploy
```bash
ssh -i feastory.pem ubuntu@<ELASTIC-IP>

sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu && newgrp docker

git clone https://github.com/<you>/feastory.git && cd feastory

cat > .env <<'EOF'
MONGO_URL=mongodb+srv://feastory_app:<PASSWORD>@feastory.abc12.mongodb.net/?retryWrites=true&w=majority&appName=feastory
JWT_SECRET=<paste generated secret>
CORS_ORIGINS=http://<ELASTIC-IP>
PUBLIC_BASE_URL=http://<ELASTIC-IP>
STORAGE_BACKEND=s3
S3_BUCKET=feastory-dish-images
AWS_REGION=ap-south-1
# WEB3FORMS_ACCESS_KEY=<your key>   # optional: where feedback e-mails go
EOF
```

Since the database is on Atlas, remove the local `mongo` service: in `docker-compose.yml` delete the `mongo:` block and the `depends_on:` block under `backend`. Then:

```bash
docker compose up -d --build
docker compose logs -f backend      # wait for "Application startup complete"
```

Open `http://<ELASTIC-IP>` → the site. `http://<ELASTIC-IP>:8000/docs` → API docs.
Manager login: Emp ID `1234567890`, PIN `1234` (set `SEED_STAFF_*` in `.env` **before** first start to change, or update the document in Atlas → Collections → `canteen_staff`).

### A3. (Optional) Domain + HTTPS
Point a domain's A record to the Elastic IP, then:
```bash
sudo apt install -y certbot
docker compose stop frontend
sudo certbot certonly --standalone -d feastory.yourdomain.com
```
Mount `/etc/letsencrypt` into the nginx container and add a 443 `server` block — or simply put **CloudFront** in front of the EC2 for free HTTPS.

### A4. Updating
```bash
cd feastory && git pull && docker compose up -d --build
```

---

## Option B — S3 + CloudFront (frontend), App Runner (backend), Atlas

### B1. Backend on App Runner
1. Console → **App Runner → Create service**
2. Source: **Source code repository** → connect GitHub → repo `feastory`, branch `main`
3. Deployment: **Automatic**
4. Build settings → **Configure all settings here**:
   - Runtime **Python 3.11**, Source directory `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Port `8000`
5. Service settings:
   - Name `feastory-api`, 1 vCPU / 2 GB
   - **Environment variables**:
     ```
     MONGO_URL        mongodb+srv://feastory_app:<PASSWORD>@feastory.abc12.mongodb.net/?retryWrites=true&w=majority&appName=feastory
     JWT_SECRET       <generated secret>
     STORAGE_BACKEND  s3
     S3_BUCKET        feastory-dish-images
     AWS_REGION       ap-south-1
     CORS_ORIGINS     https://<your-cloudfront-domain>   (fill in after B2)
     WEB3FORMS_ACCESS_KEY  <optional: your web3forms key for feedback e-mails>
     ```
   - Security → **Instance role**: role for App Runner with the `FeastoryS3Write` policy
   - Networking: **Public** outgoing traffic is fine (Atlas is reached over the internet; keep `0.0.0.0/0` in Atlas Network Access, or add a NAT gateway later for a fixed IP)
6. Create & deploy (~5 min). Copy the **Default domain**: `https://xxxxx.ap-south-1.awsapprunner.com`
7. Check: `https://xxxxx.ap-south-1.awsapprunner.com/api/health` → `{"status":"ok","storage":"s3","db":"feastory"}`

### B2. Frontend on S3 + CloudFront
```bash
cd frontend
echo "VITE_API_URL=https://xxxxx.ap-south-1.awsapprunner.com" > .env.production
npm ci && npm run build

aws s3 mb s3://feastory-web --region ap-south-1
aws s3 sync dist/ s3://feastory-web --delete
```

CloudFront → **Create distribution**:
- Origin: the `feastory-web` bucket → **Origin access control (OAC)** → create → after creation click **Copy policy** and paste into the bucket policy (CloudFront shows the button).
- Viewer protocol: **Redirect HTTP to HTTPS**; Default root object `index.html`
- **Error pages** → custom error response: HTTP **403** → `/index.html`, code **200**. Repeat for **404**. (Makes React Router paths like `/canteen/menu` work on refresh.)

Copy the distribution domain, go back to App Runner → Configuration → env → `CORS_ORIGINS=https://d1234abcd.cloudfront.net` → Deploy.

### B3. Updating
- Backend: `git push` → App Runner redeploys automatically.
- Frontend:
  ```bash
  npm run build && aws s3 sync dist/ s3://feastory-web --delete
  aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
  ```

---

## Verifying the deployment

1. `/api/health` returns ok with `"db":"feastory"`.
2. Atlas → **Collections** → you should see `categories`, `dishes`, `canteen_staff`, `counters` after first start.
3. Register a student → add to cart → checkout → PDF bill → order shows under **orders**; in Atlas, `orders` and `wallet_transactions` gained documents.
4. Manager → **orders** → Pending → *Ready to serve* → *Served*.
5. Manager → **menu** → **+ Add Dish** with an image → `image_url` starts with `https://feastory-dish-images.s3…` → dish visible to students.

## Troubleshooting

| Symptom | Fix |
|---|---|
| API won't start: `ServerSelectionTimeoutError` | Atlas Network Access doesn't include the server's IP → add `0.0.0.0/0` or the Elastic IP. Or the password in `MONGO_URL` isn't URL-encoded. |
| `Authentication failed` | Wrong DB user/password; recreate the user in Atlas → Database Access. |
| `dnspython must be installed` | `pip install "pymongo[srv]"` (already in requirements.txt). |
| Frontend shows "Failed to fetch" | `CORS_ORIGINS` on the backend must equal the exact frontend origin (scheme + host, no trailing slash). |
| Image upload returns 500 | Instance role lacks `s3:PutObject` on the bucket, or `S3_BUCKET` typo. |
| Refreshing `/menu` on CloudFront gives 403 | Add the 403/404 → `/index.html` custom error responses. |
| Manager PIN forgotten | Atlas → Collections → `canteen_staff` → edit `pin_hash` (generate with `python -c "import bcrypt;print(bcrypt.hashpw(b'5678',bcrypt.gensalt()).decode())"`). |

## Cost control
- Atlas M0 is free with no expiry (512 MB, plenty for this app). EC2 t3.micro is free for 12 months — **stop** it when not demoing.
- Set a **Billing alarm** (Billing → Budgets → ₹500/month) on day one.
