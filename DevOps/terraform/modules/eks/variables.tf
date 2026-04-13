variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "vetaorigin-eks"
}

variable "cluster_version" {
  default = "1.31"
}

variable "node_instance_type" {
  default = "t3.medium"
}

variable "desired_size" {
  default = 2
}

variable "min_size" {
  default = 2
}

variable "max_size" {
  default = 5
}
