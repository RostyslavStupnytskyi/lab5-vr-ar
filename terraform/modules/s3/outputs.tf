output "bucket_name" {
  description = "Ім'я S3 бакету"
  value       = aws_s3_bucket.website.id
}

output "bucket_arn" {
  description = "ARN S3 бакету"
  value       = aws_s3_bucket.website.arn
}

output "bucket_regional_domain_name" {
  description = "Регіональний доменне ім'я бакету"
  value       = aws_s3_bucket.website.bucket_regional_domain_name
}

output "website_endpoint" {
  description = "Endpoint для статичного веб-сайту"
  value       = aws_s3_bucket_website_configuration.website.website_endpoint
}

output "cloudfront_access_identity_path" {
  description = "Шлях до CloudFront Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path
} 