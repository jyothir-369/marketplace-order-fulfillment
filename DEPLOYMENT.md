# Deployment Guide - Phase 10 Implementation

## Overview

This guide covers the deployment of the Marketplace Order & Fulfillment System to production using Docker, AWS ECS, and GitHub Actions CI/CD.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS CLI (for production deployment)
- Terraform 1.6+ (for infrastructure)

## Local Development

### Quick Start

```bash
# Install dependencies
npm install

# Start all services with Docker Compose
docker compose up -d

# View logs
docker compose logs -f api

# Stop services
docker compose down
```

### Development Mode

```bash
# Run database seed
npm run seed

# Start in development mode
npm run start:dev
```

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker compose build

# Start all services
docker compose up -d

# Check health
curl http://localhost:3000/health

# View logs
docker compose logs -f
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure these variables:

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| PORT | API Port | 3000 |
| DB_HOST | PostgreSQL host | postgres |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | Database username | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_DATABASE | Database name | marketplace |
| REDIS_HOST | Redis host | redis |
| REDIS_PORT | Redis port | 6379 |
| REDIS_PASSWORD | Redis password | (empty) |

## AWS Deployment (Production)

### Infrastructure Setup

1. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

2. **Initialize Terraform:**
   ```bash
   cd infrastructure/terraform
   terraform init
   ```

3. **Create production variables file:**
   ```bash
   cat > production.tfvars << EOF
   aws_region = "us-east-1"
   environment = "production"
   db_instance_class = "db.t3.medium"
   redis_node_type = "cache.t3.micro"
   task_cpu = 512
   task_memory = 1024
   desired_count = 2
   certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT:certificate/ID"
   EOF
   ```

4. **Plan and apply:**
   ```bash
   terraform plan -var-file=production.tfvars
   terraform apply -var-file=production.tfvars
   ```

### Database Setup

```bash
# Connect to RDS
psql -h <db-endpoint> -U marketplace -d marketplace

# Run migrations
npm run migration:run
```

### Deploy Application

```bash
# Push Docker image to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-url>
docker build -t marketplace-api .
docker tag marketplace-api:latest <ecr-url>:latest
docker push <ecr-url>:latest

# Update ECS service
aws ecs update-service --cluster marketplace-cluster --service marketplace-api --force-new-deployment
```

## GitHub Actions CI/CD

The CI/CD pipeline automatically:

1. **Lints and type-checks** on every push
2. **Builds** the application on main branch
3. **Pushes** Docker image to GHCR on main branch
4. **Deploys** to ECS on main branch

### Required Secrets

Configure these in GitHub Settings > Secrets:

| Secret | Description |
|--------|-------------|
| AWS_ACCESS_KEY_ID | AWS access key for deployment |
| AWS_SECRET_ACCESS_KEY | AWS secret key for deployment |
| AWS_REGION | AWS region (e.g., us-east-1) |

## Health Checks

The application exposes health endpoints:

| Endpoint | Purpose |
|----------|---------|
| GET /health | Full health status with DB/Redis checks |
| GET /health/live | Liveness probe |
| GET /health/ready | Readiness probe |

## Monitoring

### CloudWatch Logs

Logs are automatically sent to CloudWatch under `/ecs/marketplace-order-fulfillment`.

### Key Metrics

- API response times
- Database connection pool usage
- Redis connection status
- ECS task health

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker compose logs api

# Verify environment variables
docker compose exec api env
```

### Database connection issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Verify connection
docker compose exec api npm run migration:status
```

### ECS deployment fails

```bash
# Check task definition
aws ecs describe-task-definition --task-definition marketplace-api

# View service events
aws ecs describe-services --cluster marketplace-cluster --services marketplace-api
```

## Rollback

### Docker Compose (Local)

```bash
docker compose down
docker compose up -d
```

### ECS (Production)

```bash
# Get previous task definition revision
aws ecs list-task-definitions --family marketplace-api --sort DESC

# Update service with previous revision
aws ecs update-service \
  --cluster marketplace-cluster \
  --service marketplace-api \
  --task-definition marketplace-api:PREVIOUS_REVISION
```

## Security Checklist

- [ ] Use strong database passwords (use Secrets Manager)
- [ ] Enable HTTPS on Load Balancer
- [ ] Configure Redis authentication
- [ ] Set appropriate IAM roles
- [ ] Enable VPC flow logs
- [ ] Configure CloudWatch alarms
- [ ] Regular security updates

## Performance Tuning

### Recommended Settings

| Component | Setting |
|-----------|---------|
| ECS Task CPU | 512 units |
| ECS Task Memory | 1024 MB |
| RDS Instance | db.t3.medium |
| ElastiCache | cache.t3.micro |
| Desired Tasks | 2 (production) |

## Support

For issues, check:
- Application logs in CloudWatch
- ECS service events
- PostgreSQL and Redis logs