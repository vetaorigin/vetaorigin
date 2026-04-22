resource "aws_db_subnet_group" "rds_subnet" {
  name       = "rds-subnet-group"
  subnet_ids = var.private_subnets
  tags = { Name = "rds-subnet-group" }
}

resource "aws_db_instance" "rds" {
  identifier              = "prod-postgres"
  engine                  = "postgres"
  engine_version          = "15"
  instance_class          = var.rds_instance_class
  allocated_storage       = 50
  max_allocated_storage   = 100
  storage_type            = "gp3"
  multi_az                = true
  publicly_accessible     = false
  db_subnet_group_name    = aws_db_subnet_group.rds_subnet.name
  username                = var.rds_username
  password                = var.rds_password
  backup_retention_period = 7
  skip_final_snapshot     = false
  tags = { Environment = "prod" }
}
