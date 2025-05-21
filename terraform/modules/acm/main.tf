# ВАЖЛИВО: SSL сертифікат для CloudFront має бути в регіоні us-east-1 (N. Virginia)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Запит сертифікату в ACM
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1 # CloudFront вимагає сертифікат у регіоні us-east-1
  domain_name       = "${var.subdomain}.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = []

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.subdomain}.${var.domain_name} SSL Certificate"
    Environment = "Production"
  }
}

# Отримання даних зони Route53 для валідації
data "aws_route53_zone" "zone" {
  name         = var.domain_name
  private_zone = false
}

# Створення записів DNS для валідації сертифікату
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.zone.zone_id
}

# Очікування валідації сертифікату
resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
} 