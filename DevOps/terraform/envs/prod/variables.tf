# Subnets
variable "private_subnets" {
  type        = list(string)
  description = "List of private subnet IDs"
}

# RDS
variable "rds_username" {
  type        = string
  description = "RDS master username"
}

variable "rds_password" {
  type        = string
  description = "RDS master password"
}

variable "rds_db_name" {
  type        = string
  description = "RDS database name"
}

variable "rds_instance_class" {
  type        = string
  description = "RDS instance type"
}

variable "rds_allocated_storage" {
  type        = number
  description = "RDS allocated storage in GB"
}

# Redis
variable "redis_subnets" {
  type        = list(string)
  description = "List of subnets for Redis"
}

variable "redis_subnet_group_name" {
  type        = string
  description = "Name of Redis subnet group"
}

variable "redis_node_type" {
  type        = string
  description = "Redis node type (e.g., cache.t3.micro)"
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of Redis cache nodes"
}

variable "redis_engine_version" {
  type        = string
  description = "Redis engine version"
}

variable "redis_password" {
  type        = string
  description = "Redis password"
}
