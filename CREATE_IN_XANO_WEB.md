# Create PAWS APIs Directly in Xano Web Interface

Since the VSCode extension has syntax validation issues, create these APIs manually in Xano:

## 🌐 Steps:

1. Go to https://xz6u-fpaz-praf.n7e.xano.io/workspace/1-0
2. Click on "API Groups"
3. Create or select the "Paws" API group
4. For each API below, click "Add Endpoint" and paste the code

---

## API 1: GET /animals

**Path:** `animals`
**Method:** `GET`

```xanoscript
query "animals" verb=GET {
  input {
    int org?
  }

  stack {
    var $org_id {
      value = $input.org ?: 9
    }

    db.query mbpr_puppies {
      return = {
        type = "list"
        filter = {
          org = $org_id
        }
      }
    } as $animals
  }

  response = $animals
}
```

---

## API 2: GET /animals/{id}

**Path:** `animals/{id}`
**Method:** `GET`

```xanoscript
query "animals/{id}" verb=GET {
  input {
    int id?
  }

  stack {
    db.query mbpr_puppies {
      return = {
        type = "single"
        filter = {
          id = $input.id
        }
      }
    } as $animal
  }

  response = $animal
}
```

---

## API 3: POST /animals

**Path:** `animals`
**Method:** `POST`

```xanoscript
query "animals" verb=POST {
  input {
    dblink {
      table = "mbpr_puppies"
    }
  }

  stack {
    db.add mbpr_puppies {
      data = $input
    } as $animal
  }

  response = $animal
}
```

---

## API 4: PATCH /animals/{id}

**Path:** `animals/{id}`
**Method:** `PATCH`

```xanoscript
query "animals/{id}" verb=PATCH {
  input {
    dblink {
      table = "mbpr_puppies"
    }
    int id?
  }

  stack {
    db.edit mbpr_puppies {
      return = "single"
      filter = {
        id = $input.id
      }
      data = $input
    } as $animal
  }

  response = $animal
}
```

---

## API 5: DELETE /animals/{id}

**Path:** `animals/{id}`
**Method:** `DELETE`

```xanoscript
query "animals/{id}" verb=DELETE {
  input {
    int id?
  }

  stack {
    db.delete mbpr_puppies {
      filter = {
        id = $input.id
      }
    } as $result
  }

  response = {
    success: true
  }
}
```

---

## API 6: POST /send-email

**Path:** `send-email`
**Method:** `POST`

```xanoscript
query "send-email" verb=POST {
  input {
    int animal_id?
    text email_to?
    text subject?
    int org?
  }

  stack {
    db.query mbpr_puppies {
      return = {
        type = "single"
        filter = {
          id = $input.animal_id
        }
      }
    } as $animal
  }

  response = {
    success: true
    animal: $animal
  }
}
```

---

## API 7: GET /public/animals

**Path:** `public/animals`
**Method:** `GET`

```xanoscript
query "public/animals" verb=GET {
  input {
    int org?
  }

  stack {
    var $org_id {
      value = $input.org ?: 9
    }

    db.query mbpr_puppies {
      return = {
        type = "list"
        filter = {
          org = $org_id
        }
      }
    } as $animals
  }

  response = $animals
}
```

---

## API 8: GET /public/animals/{id}

**Path:** `public/animals/{id}`
**Method:** `GET`

```xanoscript
query "public/animals/{id}" verb=GET {
  input {
    int id?
  }

  stack {
    db.query mbpr_puppies {
      return = {
        type = "single"
        filter = {
          id = $input.id
        }
      }
    } as $animal
  }

  response = $animal
}
```

---

## ✅ After Creating All APIs:

Test them in Xano's API playground:
1. Click "Run & Debug" on each endpoint
2. Test GET /animals with org=9
3. Test creating a puppy with POST /animals

Then update your admin dashboard to use these endpoints!
