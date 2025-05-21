output "acm_certificate_arn" {
  description = "ARN сертифікату ACM"
  value       = aws_acm_certificate.cert.arn
}
 
output "acm_certificate_status" {
  description = "Статус валідації сертифікату ACM"
  value       = aws_acm_certificate.cert.status
} 