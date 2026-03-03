locals {
  custom_domain_enabled = trimspace(var.domain_name) != ""
  custom_domain_names   = local.custom_domain_enabled ? (var.create_www_record ? [var.domain_name, "www.${var.domain_name}"] : [var.domain_name]) : []
}

resource "aws_route53_zone" "primary" {
  count = local.custom_domain_enabled ? 1 : 0

  name = var.domain_name

  tags = {
    Name = "${local.name_prefix}-zone"
  }
}

resource "aws_acm_certificate" "frontend" {
  count    = local.custom_domain_enabled ? 1 : 0
  provider = aws.us_east_1

  domain_name               = local.custom_domain_names[0]
  subject_alternative_names = slice(local.custom_domain_names, 1, length(local.custom_domain_names))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = local.custom_domain_enabled ? {
    for dvo in aws_acm_certificate.frontend[0].domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = aws_route53_zone.primary[0].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "frontend" {
  count    = local.custom_domain_enabled ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

resource "aws_route53_record" "frontend_alias_a" {
  for_each = local.custom_domain_enabled ? toset(local.custom_domain_names) : toset([])

  zone_id = aws_route53_zone.primary[0].zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_alias_aaaa" {
  for_each = local.custom_domain_enabled ? toset(local.custom_domain_names) : toset([])

  zone_id = aws_route53_zone.primary[0].zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
