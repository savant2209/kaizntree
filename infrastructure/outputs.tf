output "vpc_id" {
  description = "Default VPC ID"
  value       = data.aws_vpc.default.id
}

output "default_subnet_ids" {
  description = "Default subnet IDs used by resources"
  value       = local.default_subnet_ids
}

/*
output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}
*/

output "app_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "Database security group ID"
  value       = aws_security_group.db.id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.address
}

output "elastic_beanstalk_url" {
  description = "Elastic Beanstalk environment URL"
  value       = aws_elastic_beanstalk_environment.app.endpoint_url
}

output "frontend_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "route53_zone_id" {
  description = "Route53 Hosted Zone ID for custom domain"
  value       = local.custom_domain_enabled ? aws_route53_zone.primary[0].zone_id : null
}

output "route53_name_servers" {
  description = "Route53 Hosted Zone name servers to configure at your domain registrar"
  value       = local.custom_domain_enabled ? aws_route53_zone.primary[0].name_servers : []
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  value       = local.custom_domain_enabled ? aws_acm_certificate.frontend[0].arn : null
}

output "elastic_beanstalk_application_name" {
  description = "Elastic Beanstalk application name"
  value       = aws_elastic_beanstalk_application.app.name
}

output "elastic_beanstalk_environment_name" {
  description = "Elastic Beanstalk environment name"
  value       = aws_elastic_beanstalk_environment.app.name
}
