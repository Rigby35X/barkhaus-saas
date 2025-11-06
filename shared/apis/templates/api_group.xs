api_group Templates {
  canonical = "cz-ZpYmR"
  swagger = {token: "G6lpCML4kDSQm80gmftwv9V13VE"}
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