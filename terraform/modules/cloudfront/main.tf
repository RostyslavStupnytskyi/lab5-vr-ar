# CloudFront дистрибуція
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = var.bucket_regional_domain_name
    origin_id   = "S3-${var.bucket_name}"

    s3_origin_config {
      origin_access_identity = var.origin_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Використовуємо тільки найдешевші локації (Північна Америка та Європа)
  aliases             = ["${var.subdomain}.${var.domain_name}"]

  # Для SPA/PWA: перенаправлення 404 на index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # Конфігурація кешування та поведінки для різних шляхів
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }

    min_ttl                = 0
    default_ttl            = 3600  # 1 година
    max_ttl                = 86400 # 1 день
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Правило для статичних ассетів (довший час кешування)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 86400  # 1 день
    max_ttl                = 604800 # 1 тиждень
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Оптимізація для програми WebXR
  ordered_cache_behavior {
    path_pattern     = "*.js"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }

    min_ttl                = 0
    default_ttl            = 3600  # 1 година
    max_ttl                = 86400 # 1 день
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Обмеження за географією (опціонально)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Налаштування SSL
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Додаємо HTTP security headers через Lambda@Edge або CloudFront Functions
  # (для WebXR потрібні специфічні заголовки безпеки, яких тут немає)

  tags = {
    Name        = "${var.subdomain}.${var.domain_name}-distribution"
    Environment = "Production"
  }

  # Додаємо підтримку для WebXR через заголовки
  # Це важливо для правильної роботи AR/VR
  web_acl_id = "" # Можна додати WAF для додаткового захисту
} 