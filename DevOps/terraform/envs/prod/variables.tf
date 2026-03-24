variable "private_subnets" { type = list(string) }
variable "redis_subnets" { type = list(string) }

# RDS
variable "rds_username" {}
variable "rds_password" {}
variable "rds_db_name" {}
variable "rds_instance_class" {}
variable "rds_allocated_storage" {}

# Redis
variable "redis_node_type" {}
variable "redis_num_cache_nodes" {}
variable "redis_engine_version" {}
variable "redis_password" {}
