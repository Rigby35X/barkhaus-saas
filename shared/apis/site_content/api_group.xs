api_group site_content {
  canonical = "GMSb9gZv"
  cors = {
    mode       : "custom"
    origins    : ["http://localhost:5173", "https://localhost:5173"]
    methods    : ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]
    headers    : []
    credentials: false
    max_age    : 3600
  }
}