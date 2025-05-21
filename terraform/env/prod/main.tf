terraform {
  backend "s3" {
    bucket         = "terraform-state-vrar-webapp"
    key            = "vr-ar-5/prod/terraform.tfstate"
    region         = "eu-west-2"
  }
}

module "prod" {
  source = "../../"

  # Перевизначення змінних для продакшну
  region      = "eu-west-2"
  domain_name = "rossaitech.com"
  subdomain   = "vr-ar-5"
  bucket_name = "vr-ar-5-rossaitech-com-static"

  cors_allowed_origins = [
    "https://vr-ar-5.rossaitech.com",
    "https://rossaitech.com"
  ]

  default_tags = {
    Environment = "Production"
    Project     = "VR-AR-Lab-5"
    ManagedBy   = "Terraform"
    Owner       = "Rostyslav"
  }
} 