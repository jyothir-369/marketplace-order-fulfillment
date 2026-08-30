# ============================================
# Terraform - Outputs
# Phase 10 Implementation
# ============================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.marketplace.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.marketplace.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.marketplace.name
}

output "task_definition_family" {
  description = "Family of the ECS task definition"
  value       = aws_ecs_task_definition.marketplace.family
}

output "db_instance_endpoint" {
  description = "Connection endpoint for the DB instance"
  value       = aws_db_instance.marketplace.endpoint
}

output "redis_cache_endpoint" {
  description = "Configuration endpoint for the ElastiCache cluster"
  value       = aws_elasticache_cluster.marketplace.configuration_endpoint.address
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.marketplace.dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.marketplace.repository_url
}