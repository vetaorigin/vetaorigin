// RDS variables
variable "rds_username" {
  description = "Username for the RDS PostgreSQL instance"
  type        = string
  sensitive   = true
}

variable "rds_password" {
  description = "Password for the RDS PostgreSQL instance"
  type        = string
  sensitive   = true
}

variable "rds_db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
}

variable "rds_instance_class" {
  description = "RDS instance type"
  type        = string
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
}

variable "private_subnets" {
  type        = list(string)
  description = "List of private subnet IDs for the RDS instances"
}
