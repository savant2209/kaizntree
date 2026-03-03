variable "project_name" {
  description = "Project name used in resource tags and names"
  type        = string
  default     = "kaizntree"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile name to use (leave empty to use default credential chain)"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "kaizntree"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_sslmode" {
  description = "PostgreSQL SSL mode used by Django"
  type        = string
  default     = ""
}

variable "db_sslrootcert" {
  description = "CA bundle path on Elastic Beanstalk instance for PostgreSQL TLS validation"
  type        = string
  default     = "/etc/pki/tls/certs/ca-bundle.crt"
}

variable "django_secret_key" {
  description = "Django SECRET_KEY used in production"
  type        = string
  sensitive   = true
  default     = ""
}

variable "db_instance_class" {
  description = "RDS instance class (keep micro for low cost)"
  type        = string
  default     = "db.t3.micro"
}

variable "eb_instance_type" {
  description = "Elastic Beanstalk EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "eb_excluded_azs" {
  description = "Availability zones to exclude from Beanstalk subnet selection (useful when instance type is unavailable in specific AZs)"
  type        = list(string)
  default     = ["us-east-1e"]
}

variable "frontend_bucket_name" {
  description = "Optional S3 bucket name for frontend (leave empty to auto-generate)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Custom domain apex (e.g. example.com). Leave empty to skip Route53/ACM setup."
  type        = string
  default     = ""
}

variable "create_www_record" {
  description = "Whether to include www.<domain_name> in ACM and DNS aliases"
  type        = bool
  default     = true
}
