# Отримання даних зони Route53
data "aws_route53_zone" "zone" {
  name         = var.domain_name
  private_zone = false
}

# Створення запису DNS для піддомену
resource "aws_route53_record" "subdomain" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "${var.subdomain}.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
} 