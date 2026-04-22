variable "redis_subnets" {
  type = list(string)
}

variable "redis_subnet_group_name" {
  type = string
}

variable "redis_node_type" {
  type = string
}

variable "redis_num_cache_nodes" {
  type = number
}

variable "redis_engine_version" {
  type = string
}

variable "redis_password" {
  type      = string
  sensitive = true
}
