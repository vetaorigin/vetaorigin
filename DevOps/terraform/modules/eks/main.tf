# ----------------------------
# REMOTE STATE (VPC)
# ----------------------------
data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    bucket = "vetaorigin-terraform-state-bucket"
    key    = "global/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

# ----------------------------
# EKS CLUSTER
# ----------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  # VPC Integration
  vpc_id     = data.terraform_remote_state.vpc.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_app_subnets

  # API Endpoint Access
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true

  # IAM Roles for Service Accounts
  enable_irsa = true

  # Core EKS Add-ons
  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  # ✅ ACCESS FIX (THIS WAS MISSING)
  access_entries = {
    admin = {
      principal_arn = "arn:aws:iam::598456800596:user/fadilah@vetaorigin.com"

      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  # Managed Node Group
  eks_managed_node_groups = {
    general = {
      instance_types = [var.node_instance_type]

      min_size     = var.min_size
      max_size     = var.max_size
      desired_size = var.desired_size

      # Nodes run in private app subnets
      subnet_ids = data.terraform_remote_state.vpc.outputs.private_app_subnets
    }
  }

  tags = {
    Project = "vetaorigin"
  }
}
