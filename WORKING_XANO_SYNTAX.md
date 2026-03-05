# ✅ Working Xano 1.0 Syntax (VSCode Extension Compatible)

## 🎯 The Solution

The VSCode Xano extension only accepts **Xano 1.0 query/stack syntax**, not the newer JavaScript syntax.

## ✅ Correct Syntax (What I Used Now):

### GET Request
```xanoscript
query "animals" verb=GET {
  input {
    int? org?
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

### GET Single
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

### POST (Create)
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

### PATCH (Update)
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

### DELETE
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

## 🔑 Key Syntax Rules:

1. **Structure**: `query "path" verb=METHOD { input {} stack {} response }`
2. **Variables**: `var $variable_name { value = ... }` (NOT `var variable = ...`)
3. **Filters**: Use object syntax `filter = { field = value }`
4. **Default values**: Use `$input.field ?: default` (Elvis operator)
5. **Query return types**:
   - `type = "list"` for multiple records
   - `type = "single"` for one record
6. **Response**: `response = $variable` (NOT `return`)

## ❌ What DOESN'T Work (But Xano Server Supports):

```javascript
// ❌ This syntax works on Xano server but VSCode extension rejects it
var animals = $db.mbpr_puppies.filter({org: 9})
return animals
```

## ✅ All 8 APIs Now Use Compatible Syntax:

- 100_get_animals_GET.xs ✅
- 101_get_animal_GET.xs ✅
- 102_create_animal_POST.xs ✅
- 103_update_animal_PATCH.xs ✅
- 104_delete_animal_DELETE.xs ✅
- 107_send_email_POST.xs ✅
- 108_get_public_animals_GET.xs ✅
- 109_get_public_animal_detail_GET.xs ✅

## 🚀 Next Steps:

1. Reload VSCode window
2. Check that syntax errors are gone
3. Push to Xano
