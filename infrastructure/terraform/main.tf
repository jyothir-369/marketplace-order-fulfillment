# ============================================
# Terraform - Main Infrastructure
# Phase 10 Implementation
# ============================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "marketplace-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC for the application
resource "aws_vpc" "marketplace" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "marketplace-vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.marketplace.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "marketplace-public-${count.index + 1}"
    Environment = var.environment
    Type        = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.marketplace.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "marketplace-private-${count.index + 1}"
    Environment = var.environment
    Type        = "private"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "marketplace" {
  vpc_id = aws_vpc.marketplace.id

  tags = {
    Name        = "marketplace-igw"
    Environment = var.environment
  }
}

# NAT Gateway for private subnets
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "marketplace-nat-eip"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "marketplace" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "marketplace-nat"
    Environment = var.environment
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.marketplace.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.marketplace.id
  }

  tags = {
    Name        = "marketplace-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.marketplace.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.marketplace.id
  }

  tags = {
    Name        = "marketplace-private-rt"
    Environment = var.environment
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "marketplace-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.marketplace.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "marketplace-alb-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "ecs" {
  name        = "marketplace-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.marketplace.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port = 5432
    to_port   = 5432
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "marketplace-ecs-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "marketplace-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.marketplace.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "marketplace-rds-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "elasticache" {
  name        = "marketplace-elasticache-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.marketplace.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "marketplace-elasticache-sg"
    Environment = var.environment
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "marketplace" {
  identifier             = "marketplace-db"
  engine                = "postgres"
  engine_version        = "16.1"
  instance_class        = var.db_instance_class
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = replace(var.project_name, "-", "_")
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.marketplace.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  skip_final_snapshot       = var.environment == "development" ? true : false
  final_snapshot_identifier = var.environment != "development" ? "${var.project_name}-final-snapshot" : null

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "marketplace-db"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "marketplace" {
  name       = "marketplace-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "marketplace-db-subnet-group"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "marketplace" {
  name       = "marketplace-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "marketplace" {
  cluster_id           = "marketplace-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  security_group_ids = [aws_security_group.elasticache.id]
  subnet_group_name  = aws_elasticache_subnet_group.marketplace.name

  snapshot_retention_limit   = 3
  snapshot_window            = "04:00-06:00"
  maintenance_window         = "mon:06:00-mon:08:00"
  auto_minor_version_upgrade = true

  tags = {
    Name        = "marketplace-redis"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "marketplace" {
  name = var.project_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "marketplace-cluster"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "marketplace" {
  name               = "marketplace-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "marketplace-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "marketplace" {
  name     = "marketplace-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.marketplace.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health/live"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  target_type = "ip"

  tags = {
    Name        = "marketplace-tg"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "marketplace" {
  load_balancer_arn = aws_lb.marketplace.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.marketplace.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.marketplace.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.marketplace.arn
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "marketplace" {
  family                   = "marketplace-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "marketplace-api"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "DB_HOST", value = aws_db_instance.marketplace.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_DATABASE", value = replace(var.project_name, "-", "_") },
        { name = "REDIS_HOST", value = aws_elasticache_cluster.marketplace.cache_nodes[0].address },
        { name = "REDIS_PORT", value = "6379" }
      ]

      secrets = [
        { name = "DB_USERNAME", valueFrom = "${aws_secretsmanager_secret.db_username.arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.db_password.arn}:password::" },
        { name = "REDIS_PASSWORD", valueFrom = "${aws_secretsmanager_secret.redis_password.arn}:password::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.marketplace.name
          "awslogs-region"         = var.aws_region
          "awslogs-stream-prefix" = "marketplace-api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = {
    Name        = "marketplace-api-task"
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "marketplace" {
  name            = "marketplace-api"
  cluster         = aws_ecs_cluster.marketplace.iam_role
  task_definition = aws_ecs_task_definition.marketplace.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_controller {
    type = "ECS"
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds  = 60

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.marketplace.arn
    container_name   = "marketplace-api"
    container_port   = 3000
  }

  depends_on = [aws_lb.marketplace]

  tags = {
    Name        = "marketplace-api-service"
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "marketplace" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 14

  tags = {
    Name        = "marketplace-log-group"
    Environment = var.environment
  }
}

# IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "marketplace-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "marketplace-ecs-execution-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "marketplace-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "marketplace-ecs-task-role"
    Environment = var.environment
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "db_username" {
  name        = "${var.project_name}/db-username"
  description = "Database username for Marketplace application"

  tags = {
    Name        = "marketplace-db-username"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.project_name}/db-password"
  description = "Database password for Marketplace application"

  tags = {
    Name        = "marketplace-db-password"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "redis_password" {
  name        = "${var.project_name}/redis-password"
  description = "Redis password for Marketplace application"

  tags = {
    Name        = "marketplace-redis-password"
    Environment = var.environment
  }
}

# ECR Repository
resource "aws_ecr_repository" "marketplace" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "marketplace-ecr"
    Environment = var.environment
  }
}

# Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.marketplace.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.marketplace.zone_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS Cluster"
  value       = aws_ecs_cluster.marketplace.name
}

output "db_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.marketplace.endpoint
}

output "redis_endpoint" {
  description = "Endpoint of the ElastiCache cluster"
  value       = aws_elasticache_cluster.marketplace.cache_nodes[0].address
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.marketplace.repository_url
}