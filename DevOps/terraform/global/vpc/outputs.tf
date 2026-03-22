output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnets" {
  value = aws_subnet.public[*].id
}

output "private_app_subnets" {
  value = aws_subnet.private_app[*].id
}

output "data_subnets" {
  value = aws_subnet.data[*].id
}
