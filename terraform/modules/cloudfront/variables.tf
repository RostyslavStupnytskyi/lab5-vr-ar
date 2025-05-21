variable "domain_name" {
  description = "Основний домен"
  type        = string
}

variable "subdomain" {
  description = "Піддомен для сайту"
  type        = string
}

variable "bucket_name" {
  description = "Ім'я S3 бакету"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "Регіональне доменне ім'я S3 бакету"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN сертифікату ACM"
  type        = string
}

variable "origin_access_identity_path" {
  description = "Шлях до CloudFront Origin Access Identity"
  type        = string
} 