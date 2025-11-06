api_group Authentication {
  canonical = "XqEb_TVK"
  swagger = {token: "mGDOpzrGb2PvfCn4tOJB7drqYvs"}
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