variable "domain_name" {
  description = "Основний домен"
  type        = string
}

variable "subdomain" {
  description = "Піддомен для сайту"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "Доменне ім'я дистрибуції CloudFront"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "ID зони дистрибуції CloudFront"
  type        = string
} 