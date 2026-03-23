// Redis variables
variable "redis_node_type" {
  description = "Redis node type"
  type        = string
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes for Redis"
  type        = number
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
}

variable "redis_password" {
  description = "Password for Redis"
  type        = string
  sensitive   = true
}

variable "redis_subnet_group_name" {
  description = "Subnet group name for Redis"
  type        = string
}
