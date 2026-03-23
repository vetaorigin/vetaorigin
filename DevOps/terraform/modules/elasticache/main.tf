resource "aws_elasticache_subnet_group" "redis_subnet" {
  name       = "redis-subnet-group"
  subnet_ids = var.redis_subnets
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "prod-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.small"
  num_cache_nodes      = 1
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnet.name
  parameter_group_name = "default.redis7"
  port                 = 6379
  multi_az_enabled     = true
  tags = { Environment = "prod" }
}
