terraform {
  backend "s3" {
    bucket         = "vetaorigin-terraform-state-bucket"
    key            = "global/vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
  }
}
