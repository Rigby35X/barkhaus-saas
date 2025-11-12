// Upload image to Xano file storage
query "upload-image" verb=POST {
  input {
    file image
  }

  stack {
    // Return the uploaded file resource
    // Xano automatically handles the file upload and storage
    // The file resource will contain url, path, name, type, size, mime, etc.
  }

  response = $input.image
}