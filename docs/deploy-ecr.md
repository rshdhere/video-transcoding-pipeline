# Deploy containers to ECR and ECS

This workflow builds Docker images from the monorepo root, pushes them to the ECR repositories provisioned in the `cloud-formation` infra repo, and forces new deployments on the `vtp-prod` ECS cluster.

Workflow file: [`.github/workflows/deploy-ecr.yml`](../.github/workflows/deploy-ecr.yml)

## Required GitHub configuration

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key for the deploy user |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key for the deploy user |

The IAM user needs at minimum:

- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:PutImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecs:UpdateService` on `vtp-prod-api`, `vtp-prod-worker`, and `vtp-prod-web`

### Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN_NAME` | `raashed.cloud` | Base domain used for web build args (`https://api.<DOMAIN>` and `https://app.<DOMAIN>`) |

## Image mapping

| Service | Dockerfile | ECR repository | ECS service |
|---------|------------|----------------|-------------|
| API (Bun) | `docker/server/Dockerfile` | `vtp-api` | `vtp-prod-api` |
| Worker (Go) | `docker/worker/Dockerfile` | `vtp-worker` | `vtp-prod-worker` |
| Web (Next.js) | `docker/web/Dockerfile` | `vtp-web` | `vtp-prod-web` |

Each push tags images with the short git SHA (`abcdef1`) and `latest`.

## How to run manually

1. Open the repository on GitHub.
2. Go to **Actions** → **Deploy to ECR**.
3. Click **Run workflow**, choose the `main` branch, and confirm.

Use this after infra is provisioned but before any images exist in ECR (for example, when recovering from a cancelled infra workflow).

The workflow also runs automatically on pushes to `main` that change files under `docker/**`, `apps/**`, or `packages/**`.

## How to verify

### ECR has images

```bash
aws ecr describe-images \
  --repository-name vtp-api \
  --region ap-south-1

aws ecr describe-images \
  --repository-name vtp-worker \
  --region ap-south-1

aws ecr describe-images \
  --repository-name vtp-web \
  --region ap-south-1
```

Expect both `latest` and a short-SHA tag on each repository.

### ECS tasks are running

```bash
aws ecs describe-services \
  --cluster vtp-prod \
  --services vtp-prod-api vtp-prod-worker vtp-prod-web \
  --region ap-south-1 \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount,deployments:deployments[*].{status:status,rollout:rolloutState}}' \
  --output table
```

`runningCount` should match `desiredCount`, and the primary deployment `rolloutState` should be `COMPLETED`.

### ALB health checks

Confirm target groups for the API and web services report healthy targets in the AWS console (**EC2 → Target Groups**), or hit the public endpoints:

- `https://api.<DOMAIN_NAME>/health` (or your API health route)
- `https://app.<DOMAIN_NAME>`

### CloudWatch logs

Container logs are under `/ecs/vtp-prod/`:

```bash
aws logs describe-log-streams \
  --log-group-name /ecs/vtp-prod/api \
  --order-by LastEventTime \
  --descending \
  --limit 5 \
  --region ap-south-1
```

Repeat for `/ecs/vtp-prod/worker` and `/ecs/vtp-prod/web` as needed.
