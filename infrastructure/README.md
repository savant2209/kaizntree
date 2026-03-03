# Terraform - low-cost study stack

This folder provisions a low-cost AWS setup for development/study using the default VPC.

## Architecture

- **Backend**: Elastic Beanstalk (`SingleInstance`, `t3.micro` by default)
- **Database**: RDS PostgreSQL (`db.t3.micro`, single-AZ, no final snapshot)
- **Frontend**: S3 + CloudFront (with Origin Access Control)
- **Network**: **Default VPC and default subnets** (to keep setup simple and cheap)

## Included files

- `main.tf`: account/default VPC data sources and local naming
- `security.tf`: security groups for app/db and optional alb
- `rds.tf`: PostgreSQL instance and subnet group
- `beanstalk.tf`: Elastic Beanstalk application/environment
- `frontend.tf`: S3 bucket + CloudFront distribution
- `outputs.tf`: endpoints and distribution outputs

## Quick start

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Important notes

- Set a real strong value in `db_password` before apply.
- This is optimized for **cost and simplicity**, not production hardening.
- The Elastic Beanstalk config expects the instance profile `aws-elasticbeanstalk-ec2-role` to exist.
- Do not commit `terraform.tfvars`.
