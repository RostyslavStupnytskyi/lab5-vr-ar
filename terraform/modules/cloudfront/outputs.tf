output "cloudfront_distribution_id" {
  description = "ID дистрибуції CloudFront"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

output "cloudfront_domain_name" {
  description = "Домен дистрибуції CloudFront"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "ID зони дистрибуції CloudFront"
  value       = aws_cloudfront_distribution.s3_distribution.hosted_zone_id
} 