output "website_domain" {
  description = "Домен веб-сайту"
  value       = "${var.subdomain}.${var.domain_name}"
}

output "website_url" {
  description = "URL веб-сайту"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "s3_bucket_name" {
  description = "Ім'я S3 бакету"
  value       = module.s3_website.bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID CloudFront дистрибуції"
  value       = module.cloudfront.cloudfront_distribution_id
}

output "acm_certificate_arn" {
  description = "ARN SSL/TLS сертифікату"
  value       = module.acm.acm_certificate_arn
} 