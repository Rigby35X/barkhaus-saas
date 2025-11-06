// Query all LiveSite records
query livesite verb=GET {
  input {
  }

  stack {
    db.query site_content {
      return = {type: "list"}
    } as $livesite
  }

  response = $livesite
}