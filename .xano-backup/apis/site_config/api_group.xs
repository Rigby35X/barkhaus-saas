api_group site_config {
  canonical = "1vOYCkyt"
  swagger = {token: "4YU-nsgX7ciL2CXFUqpaDxVGBqI"}
  cors = {
    mode       : "custom"
    origins    : [
      "https://*.vercel.app"
      "https://barkhaus-dash.vercel.app/"
      "http://localhost:5173"
      "https://localhost:5173"
    ]
    methods    : ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]
    headers    : ["Content-Type", "Authorization"]
    credentials: false
    max_age    : 86400
  }
}