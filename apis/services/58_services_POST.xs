// Add services record
query services verb=POST {
  input {
    dblink {
      table = "services"
    }
  }

  stack {
    db.add services {
      data = {created_at: "now"}
    } as $services
  }

  response = $services
}