api_group page_sections {
  canonical = "9udBpP-x"
  cors = {
    mode       : "custom"
    origins    : ["http://localhost:5173", "https://localhost:5173"]
    methods    : ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"]
    headers    : []
    credentials: false
    max_age    : 3600
  }
}