// Add Adoptions record
query adoptions verb=POST {
  input {
    dblink {
      table = "Adoptions"
    }
  }

  stack {
    db.add Adoptions {
      data = {
        created_at             : $input.created_at
        Adopter_Name           : $input.Adopter_Name
        Adoption_Date          : $input.Adoption_Date
        Dog                    : $input.Dog
        Adoption_Fee           : $input.Adoption_Fee
        Payment_Method         : $input.Payment_Method
        Adoption_Contract_Photo: $input.Adoption_Contract_Photo
        Notes                  : $input.Notes
        Shelter                : $input.Shelter
        Adoption_Fee_Paid      : $input.Adoption_Fee_Paid
      }
    } as $adoptions
  }

  response = $adoptions
}