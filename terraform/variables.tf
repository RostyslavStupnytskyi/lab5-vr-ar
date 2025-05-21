variable "region" {
  description = "AWS регіон для розгортання"
  type        = string
  default     = "eu-west-2" # London
}

variable "domain_name" {
  description = "Основний домен"
  type        = string
  default     = "rossaitech.com"
}

variable "subdomain" {
  description = "Піддомен для сайту"
  type        = string
  default     = "vr-ar-5"
}

variable "bucket_name" {
  description = "Ім'я S3 бакету"
  type        = string
  default     = "vr-ar-5-rossaitech-com-static"
}

variable "cors_allowed_origins" {
  description = "Дозволені домени для CORS"
  type        = list(string)
  default     = ["https://vr-ar-5.rossaitech.com", "https://rossaitech.com"]
}

variable "default_tags" {
  description = "Теги за замовчуванням для всіх ресурсів"
  type        = map(string)
  default     = {
    Environment = "Production"
    Project     = "VR-AR-Lab-5"
    ManagedBy   = "Terraform"
    Owner       = "Rostyslav"
  }
} 