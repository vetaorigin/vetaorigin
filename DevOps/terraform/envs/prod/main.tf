module "rds" {
  source = "../../modules/rds"

  private_subnets        = var.private_subnets
  rds_username           = var.rds_username
  rds_password           = var.rds_password
  rds_db_name            = var.rds_db_name
  rds_instance_class     = var.rds_instance_class
  rds_allocated_storage  = var.rds_allocated_storage
}

module "redis" {
  source = "../../modules/elasticache"

  redis_subnets          = var.redis_subnets
  redis_node_type        = var.redis_node_type
  redis_num_cache_nodes  = var.redis_num_cache_nodes
  redis_engine_version   = var.redis_engine_version
  redis_password         = var.redis_password
}
