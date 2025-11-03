api_group Animals {
  canonical = "Od874PbA"
  cors = {
    mode       : "custom"
    origins    : [
      "https://*.vercel.app"
      "https://barkhaus-dash.vercel.app/"
      "http://localhost:5173"
      "https://localhost:5173"
      "http://localhost:8080"
      "https://localhost:8080"
      "http://localhost:3000"
      "http://localhost:5174"
    ]
    methods    : ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]
    headers    : ["Content-Type", "Authorization"]
    credentials: false
    max_age    : 86400
  }
}