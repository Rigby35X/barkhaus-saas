// (Add a dog — used by admin)
query "orgs/{orgId}/animals" verb=POST {
  input {
    dblink {
      table = "animals"
    }
  
    int orgId?
  }

  stack {
    db.add animals {
      data = {
        org                  : $input.orgId
        name                 : $input.name
        litter_name          : $input.litter_name
        species              : $input.species
        breed                : $input.breed
        description          : $input.description
        status               : $input.status
        intake_date          : $input.intake_date
        image_url            : $input.image_url
        updated_at           : $input.updated_at
        age                  : $input.age
        gender               : $input.gender
        weight               : $input.weight
        color                : $input.color
        created_at           : "now"
        size                 : $input.size
        images               : $input.images
        description_long     : $input.description_long
        location             : $input.location
        vaccinated           : $input.vaccinated
        spayed_neutered      : $input.spayed_neutered
        microchip            : $input.microchip
        medical_notes        : $input.medical_notes
        special_needs        : $input.special_needs
        house_trained        : $input.house_trained
        energy_level         : $input.energy_level
        good_with_kids       : $input.good_with_kids
        org_description      : $input.org_description
        good_with_dogs       : $input.good_with_dogs
        good_with_cats       : $input.good_with_cats
        training_notes       : $input.training_notes
        playgroup_notes      : $input.playgroup_notes
        adoption_fee         : $input.adoption_fee
        adoption_fee_currency: $input.adoption_fee_currency
        org_details          : $input.org_details
        is_featured          : $input.is_featured
        priority             : $input.priority
        internal_notes       : $input.internal_notes
        meta_title           : $input.meta_title
        meta_description     : $input.meta_description
      }
    } as $model
  }

  response = $model
}