variable "domain_name" {
  description = "Основний домен"
  type        = string
}

variable "subdomain" {
  description = "Піддомен для сайту"
  type        = string
}

variable "region" {
  description = "AWS регіон для розгортання"
  type        = string
} 