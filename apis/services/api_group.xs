// Base URL
api_group services {
  canonical = "kPow7KJL"
  swagger = {token: "lSnmJiXO5731JZGFH2J9DjTmCZk"}
  cors = {
    mode       : "custom"
    origins    : ["http://localhost:5173", "https://localhost:5173"]
    methods    : ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]
    headers    : []
    credentials: false
    max_age    : 3600
  }
}