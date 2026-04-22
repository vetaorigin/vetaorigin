resource "aws_elasticache_subnet_group" "redis_subnet" {
  name        = var.redis_subnet_group_name
  subnet_ids  = var.redis_subnets
  description = "Subnet group for Redis"
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "veta-redis"
  description                   = "Redis cluster for Veta"

  engine                        = "redis"
  engine_version                = var.redis_engine_version
  node_type                     = var.redis_node_type

  num_cache_clusters            = var.redis_num_cache_nodes

  subnet_group_name             = aws_elasticache_subnet_group.redis_subnet.name

  parameter_group_name          = "default.redis7"

  port                          = 6379

  automatic_failover_enabled    = true
  multi_az_enabled              = true

  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true

  auth_token                    = var.redis_password

  tags = {
    Environment = "prod"
  }
}
