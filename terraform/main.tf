terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = var.default_tags
  }
}

# Модуль S3 бакета для статичного веб-сайту
module "s3_website" {
  source              = "./modules/s3"
  bucket_name         = var.bucket_name
  domain_name         = var.domain_name
  subdomain           = var.subdomain
  cors_allowed_origins = var.cors_allowed_origins
}

# Модуль ACM для SSL/TLS сертифікатів
module "acm" {
  source      = "./modules/acm"
  domain_name = var.domain_name
  subdomain   = var.subdomain
  region      = var.region
}

# Модуль CloudFront для CDN і HTTPS
module "cloudfront" {
  source               = "./modules/cloudfront"
  domain_name          = var.domain_name
  subdomain            = var.subdomain
  bucket_name          = module.s3_website.bucket_name
  bucket_regional_domain_name = module.s3_website.bucket_regional_domain_name
  acm_certificate_arn  = module.acm.acm_certificate_arn
  origin_access_identity_path = module.s3_website.cloudfront_access_identity_path
}

# Модуль Route53 для DNS
module "route53" {
  source               = "./modules/route53"
  domain_name          = var.domain_name
  subdomain            = var.subdomain
  cloudfront_domain_name = module.cloudfront.cloudfront_domain_name
  cloudfront_hosted_zone_id = module.cloudfront.cloudfront_hosted_zone_id
} 