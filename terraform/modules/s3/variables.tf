variable "bucket_name" {
  description = "Ім'я S3 бакету"
  type        = string
}

variable "domain_name" {
  description = "Основний домен"
  type        = string
}

variable "subdomain" {
  description = "Піддомен для сайту"
  type        = string
}

variable "cors_allowed_origins" {
  description = "Дозволені домени для CORS"
  type        = list(string)
  default     = ["*"]
} 